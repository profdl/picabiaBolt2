import { forwardRef, useImperativeHandle, useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { Shape } from "../../types";
import { useStore } from "../../store";
import { setupScene, createSceneSetup } from "../../lib/sceneSetup";

interface MeshWithUniforms extends THREE.Mesh {
  updateUniforms?: () => void;
}

export interface ThreeJSShapeRef {
  exportToGLTF: () => void;
}

export const ThreeJSShape = forwardRef<ThreeJSShapeRef, { shape: Shape }>(
  ({ shape }, ref) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const planeRef = useRef<MeshWithUniforms>(); // Updated type
    const frameIdRef = useRef<number>();
    const isInteractingRef = useRef(false);
    const { updateShape } = useStore();

    useImperativeHandle(ref, () => ({
      exportToGLTF: () => {
        if (!sceneRef.current || !planeRef.current) return;

        const bakeDisplacement = () => {
          if (!planeRef.current || !shape.depthMap) return;

          // Create a new geometry with higher resolution for export
          const exportGeometry = new THREE.PlaneGeometry(
            shape.width / shape.height,
            1,
            256,
            256
          );

          // Flip the geometry to correct orientation
          exportGeometry.scale(1, -1, 1);

          const positions = exportGeometry.attributes.position;
          const uvs = exportGeometry.attributes.uv;

          // Create an offscreen renderer to read the depth texture
          const offscreenRenderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: false,
          });
          offscreenRenderer.setSize(1024, 1024);

          // Create a temporary scene to render the depth map
          const tempScene = new THREE.Scene();
          const tempCamera = new THREE.OrthographicCamera(
            -0.5,
            0.5,
            0.5,
            -0.5,
            0.1,
            10
          );
          tempCamera.position.z = 1;

          // Create a plane with the depth texture
          const tempGeometry = new THREE.PlaneGeometry(1, 1);
          const tempMaterial = new THREE.MeshBasicMaterial();
          const tempMesh = new THREE.Mesh(tempGeometry, tempMaterial);
          tempScene.add(tempMesh);

          return new Promise<() => void>((resolve) => {
            // Load both textures simultaneously
            const textureLoader = new THREE.TextureLoader();
            const texturePromises = [
              new Promise<THREE.Texture>((resolveTexture) => {
                textureLoader.load(shape.depthMap!, resolveTexture);
              }),
              new Promise<THREE.Texture>((resolveTexture) => {
                textureLoader.load(shape.imageUrl!, resolveTexture);
              }),
            ];

            Promise.all(texturePromises)
              .then(([depthTexture, colorTexture]) => {
                tempMaterial.map = depthTexture;
                tempMaterial.needsUpdate = true;

                // Render the depth map
                offscreenRenderer.render(tempScene, tempCamera);

                // Read the pixels directly from WebGL
                const gl = offscreenRenderer.getContext();
                const pixels = new Uint8Array(1024 * 1024 * 4);
                gl.readPixels(
                  0,
                  0,
                  1024,
                  1024,
                  gl.RGBA,
                  gl.UNSIGNED_BYTE,
                  pixels
                );

                // Apply displacement to vertices
                for (let i = 0; i < positions.count; i++) {
                  const u = uvs.getX(i);
                  const v = uvs.getY(i); // No need to flip V anymore

                  const x = Math.min(Math.floor(u * 1024), 1023);
                  const y = Math.min(Math.floor(v * 1024), 1023);

                  const idx = (y * 1024 + x) * 4;
                  // Increase displacement scale for more visible effect
                  const displacement =
                    (pixels[idx] / 255) * (shape.displacementScale || 1.0);

                  const z = positions.getZ(i);
                  positions.setZ(i, z - displacement); // Invert displacement direction
                }

                positions.needsUpdate = true;
                exportGeometry.computeVertexNormals();

                // Store original geometry and material
                const originalGeometry = planeRef.current!.geometry;
                const originalMaterial = planeRef.current!.material;

                // Create and apply export material with the color texture
                const exportMaterial = new THREE.MeshStandardMaterial({
                  map: colorTexture,
                  side: THREE.DoubleSide,
                  roughness: 0.8,
                  metalness: 0.2,
                });

                // Apply new geometry and material
                planeRef.current!.geometry = exportGeometry;
                planeRef.current!.material = exportMaterial;

                // Clean up temporary resources
                offscreenRenderer.dispose();
                tempGeometry.dispose();
                tempMaterial.dispose();
                depthTexture.dispose();

                resolve(() => {
                  // Cleanup function
                  if (planeRef.current) {
                    planeRef.current.geometry = originalGeometry;
                    planeRef.current.material = originalMaterial;
                  }
                  exportGeometry.dispose();
                  exportMaterial.dispose();
                  colorTexture.dispose();
                });
              })
              .catch((error) => {
                console.error("Error loading textures:", error);
                offscreenRenderer.dispose();
                tempGeometry.dispose();
                tempMaterial.dispose();
              });
          });
        };

        // Handle the async nature of texture loading
        bakeDisplacement()?.then((restoreGeometry) => {
          if (!restoreGeometry) return;

          const exporter = new GLTFExporter();
          exporter.parse(
            sceneRef.current!,
            (gltf) => {
              const output = JSON.stringify(gltf, null, 2);
              const blob = new Blob([output], { type: "application/json" });
              const url = URL.createObjectURL(blob);

              const link = document.createElement("a");
              link.href = url;
              link.download = `scene-${shape.id}.gltf`;
              link.click();

              URL.revokeObjectURL(url);
              restoreGeometry();
            },
            (error) => {
              console.error("An error occurred during GLTF export:", error);
              restoreGeometry();
            },
            {
              binary: false,
              includeCustomExtensions: true,
              embedImages: true,
            }
          );
        });
      },
    }));
    useEffect(() => {
      if (!mountRef.current || !shape.imageUrl) return;
      const sceneConfig = createSceneSetup(
        mountRef.current,
        shape.width,
        shape.height
      );

      const cleanup = () => {
        if (frameIdRef.current) {
          cancelAnimationFrame(frameIdRef.current);
        }

        if (rendererRef.current) {
          const context = rendererRef.current.getContext();
          if (context) {
            const loseContext = context.getExtension("WEBGL_lose_context");
            if (loseContext) loseContext.loseContext();
          }
          rendererRef.current.dispose();
          rendererRef.current = null;
        }

        if (sceneRef.current) {
          sceneRef.current.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              object.geometry.dispose();
              if (Array.isArray(object.material)) {
                object.material.forEach((m) => m.dispose());
              } else {
                object.material.dispose();
              }
            }
          });
          sceneRef.current = null;
        }
      };

      cleanup();

      try {
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true, // Enable antialiasing for smoother rendering
          powerPreference: "high-performance",
        });

        // Set pixel ratio with a reasonable maximum
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(shape.width, shape.height);
        rendererRef.current = renderer;

        const mountElement = mountRef.current;
        mountElement.innerHTML = "";
        mountElement.appendChild(renderer.domElement);

        const camera = new THREE.PerspectiveCamera(
          shape.camera?.fov || 75,
          shape.width / shape.height,
          0.1,
          1000
        );

        const material = new THREE.MeshStandardMaterial({
          side: THREE.DoubleSide,
          roughness: 0.8,
          metalness: 0.2,
          transparent: true, // Enable transparency
          alphaTest: 0.5, // Adjust this value based on desired transparency threshold
        });

        // Create geometry with balanced detail
        const createGeometry = (aspect: number = 1) => {
          const segmentMultiplier = Math.min(shape.width, shape.height) / 300;
          const segments = Math.max(32, Math.floor(48 * segmentMultiplier));
          return new THREE.PlaneGeometry(
            aspect,
            1,
            Math.floor(segments * aspect),
            segments
          );
        };

        const plane = new THREE.Mesh(createGeometry(), material);
        planeRef.current = plane;
        scene.add(plane);

        const textureLoader = new THREE.TextureLoader();
        const loadTexture = (url: string): Promise<THREE.Texture> => {
          return new Promise((resolve, reject) => {
            textureLoader.load(
              url,
              (loadedTexture) => {
                loadedTexture.generateMipmaps = true; // Enable mipmaps for better scaling
                loadedTexture.minFilter = THREE.LinearMipmapLinearFilter; // Better minification filtering
                loadedTexture.magFilter = THREE.LinearFilter;
                resolve(loadedTexture);
              },
              undefined,
              reject
            );
          });
        };

        loadTexture(shape.imageUrl).then((mainTexture) => {
          if (shape.depthMap) {
            loadTexture(shape.depthMap).then((depthTexture) => {
              setupScene(
                sceneConfig.camera,
                sceneConfig.plane,
                mainTexture,
                depthTexture,
                {
                  minFOV: 60,
                  maxFOV: 90,
                  baseDistance: 0.05,
                  displacementScale: shape.displacementScale || 0.5,
                }
              );
            });
          }
        });

        (async () => {
          try {
            if (!shape.imageUrl) return;

            const mainTexture = await loadTexture(shape.imageUrl);
            const imageAspect =
              mainTexture.image.width / mainTexture.image.height;

            if (planeRef.current) {
              planeRef.current.geometry.dispose();
              planeRef.current.geometry = createGeometry(imageAspect);
              material.map = mainTexture;
              material.needsUpdate = true;

              if (typeof shape.depthMap === "string") {
                const depthTexture = await loadTexture(shape.depthMap);
                material.displacementMap = depthTexture;
                material.displacementScale = shape.displacementScale || 0.5;
                material.needsUpdate = true;
              }
            }
          } catch (error) {
            console.error("Texture loading error:", error);
          }
        })();

        // After creating the plane and setting up its geometry
        const box = new THREE.Box3().setFromObject(plane);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // Calculate distance based on object size
        const fov = shape.camera?.fov || 75;
        const fovRadians = (fov * Math.PI) / 180;
        const distance =
          (Math.max(size.x, size.y) / (2 * Math.tan(fovRadians / 2))) * 1;

        // Position camera
        camera.position.set(0, 0, distance);
        camera.lookAt(center);

        const sceneScale =
          Math.min(shape.width, shape.height) /
          Math.max(shape.width, shape.height);
        scene.scale.set(sceneScale, sceneScale, sceneScale);

        // Optimize OrbitControls for smoother interaction
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enabled = Boolean(shape.isOrbiting);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1; // Increased for smoother movement
        controls.rotateSpeed = 0.8; // Adjusted for better control
        controls.zoomSpeed = 0.8; // Adjusted for better control
        controls.panSpeed = 0.8; // Adjusted for better control
        controls.enableZoom = true;
        controls.enablePan = true;

        // Add smooth zoom constraints
        controls.minDistance = 0.1; // Changed from 0.5
        controls.maxDistance = 1.0; // Changed from 4

        // Lighting setup
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
        mainLight.position.set(2, 3, 1);
        const target = new THREE.Object3D();
        target.position.set(0, 0, -1);
        mainLight.add(target);
        mainLight.target = target;
        scene.add(mainLight);

        // Add a second directional light from another angle for better coverage
        const secondaryLight = new THREE.DirectionalLight(0xffffff, 1.2);
        secondaryLight.position.set(-1, 0.5, -1);
        scene.add(secondaryLight);

        // Brighter ambient light for better overall illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Increased intensity and using white
        scene.add(ambientLight);

        // Smooth animation loop
        const animate = () => {
          frameIdRef.current = requestAnimationFrame(animate);

          if (controls.enabled) {
            controls.update();
          }

          // Type-safe check for updateUniforms
          if (planeRef.current?.updateUniforms) {
            planeRef.current.updateUniforms();
          }

          renderer.render(scene, camera);
        };

        frameIdRef.current = requestAnimationFrame(animate);

        const handleClickOutside = (e: MouseEvent) => {
          if (!mountElement.contains(e.target as Node) && shape.isOrbiting) {
            const currentCamera = {
              position: {
                x: camera.position.x,
                y: camera.position.y,
                z: camera.position.z,
              },
              fov: camera.fov,
            };

            updateShape(shape.id, {
              isOrbiting: false,
              camera: currentCamera,
            });
          }
        };

        controls.addEventListener("start", () => {
          isInteractingRef.current = true;
        });

        controls.addEventListener("end", () => {
          isInteractingRef.current = false;
        });

        document.addEventListener("click", handleClickOutside);

        return () => {
          document.removeEventListener("click", handleClickOutside);
          cleanup();
        };
      } catch (error) {
        console.error("Three.js initialization error:", error);
        cleanup();
      }
    }, [shape, updateShape]);

    return (
      <div
        ref={mountRef}
        className="w-full h-full"
        style={{
          cursor: shape.isOrbiting ? "grab" : "default",
          pointerEvents: shape.isOrbiting ? "all" : "none",
        }}
      />
    );
  }
);
