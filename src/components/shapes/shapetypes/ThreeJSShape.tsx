import { forwardRef, useImperativeHandle, useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { useStore } from "../../../store";
import { Shape } from "../../../types";

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
    const planeRef = useRef<MeshWithUniforms>(); 
    const frameIdRef = useRef<number>();
    const controlsRef = useRef<OrbitControls | null>(null); // Add this ref
    const isInteractingRef = useRef(false);
    const { updateShape } = useStore();

    // Add click handler for orbiting
    const handleDoubleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Toggle orbiting state
      updateShape(shape.id, {
        isOrbiting: !shape.isOrbiting
      });


      // Update controls enabled state
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
    };

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


    // Texture loading helper
const loadTexture = (url: string): Promise<THREE.Texture> => {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        resolve(texture);
      },
      undefined,
      reject
    );
  });
};

    useEffect(() => {
      if (!mountRef.current || !shape.imageUrl) return;

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
        // Scene setup with black background
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        sceneRef.current = scene;
      
        // Renderer setup
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(shape.width, shape.height);
        rendererRef.current = renderer;
      
        // Mount renderer
        const mountElement = mountRef.current;
        mountElement.innerHTML = "";
        mountElement.appendChild(renderer.domElement);
      
        // Camera setup
        const camera = new THREE.PerspectiveCamera(
          shape.camera?.fov || 75,
          shape.width / shape.height,
          0.1,
          1000
        );
        camera.position.set(0, 0, 1.5);
        camera.lookAt(0, 0, 0);
      
        // Material setup
        const material = new THREE.MeshStandardMaterial({
          side: THREE.DoubleSide,
          roughness: 0.8,
          metalness: 0.2,
          transparent: true,
          alphaTest: 0.5,
        });
      
        // Create geometry helper
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
      
        // Create and add plane
        const plane = new THREE.Mesh(createGeometry(), material);
        plane.position.set(0, 0, 0);
        planeRef.current = plane;
        scene.add(plane);
      
        // Controls setup
        const controls = new OrbitControls(camera, renderer.domElement);
        controlsRef.current = controls;
        
        controls.enabled = Boolean(shape.isOrbiting);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.rotateSpeed = 0.8;
        controls.zoomSpeed = 0.8;
        controls.panSpeed = 0.8;
        controls.enableZoom = true;
        controls.enablePan = true;
        controls.minDistance = 0.5;
        controls.maxDistance = 4.0;
        
        controls.target.set(0, 0, 0);
        controls.update();
      
        // Lighting setup
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
        mainLight.position.set(2, 3, 1);
        scene.add(mainLight);
      
        const secondaryLight = new THREE.DirectionalLight(0xffffff, 1.2);
        secondaryLight.position.set(-1, 0.5, -1);
        scene.add(secondaryLight);
      
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
      
        // Load and apply textures
        const setupTextures = async () => {
          try {
            if (!shape.imageUrl) return;
        
            const mainTexture = await loadTexture(shape.imageUrl);
            const imageAspect = mainTexture.image.width / mainTexture.image.height;
          
            if (planeRef.current) {
              // Update geometry with correct aspect ratio
              planeRef.current.geometry.dispose();
              planeRef.current.geometry = createGeometry(imageAspect);
              
              // Center and scale the plane
              const scale = 1.2;
              planeRef.current.scale.set(scale, scale, scale);
              
              // Apply textures
              material.map = mainTexture;
              
              if (shape.depthMap) {
                const depthTexture = await loadTexture(shape.depthMap);
                material.displacementMap = depthTexture;
                material.displacementScale = shape.displacementScale || 0.5;
              }
              
              material.needsUpdate = true;
            }
          } catch (error) {
            console.error("Texture loading error:", error);
          }
        };
      
        // Start texture setup
        setupTextures();
      
        // Animation loop
        const animate = () => {
          frameIdRef.current = requestAnimationFrame(animate);
          
          if (controls.enabled) {
            controls.update();
          }
      
          if (planeRef.current?.updateUniforms) {
            planeRef.current.updateUniforms();
          }
      
          renderer.render(scene, camera);
        };
      
        // Start animation
        frameIdRef.current = requestAnimationFrame(animate);
      
        // Event handlers
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
      
            if (controlsRef.current) {
              controlsRef.current.enabled = false;
            }
          }
        };
      
        controls.addEventListener("start", () => {
          isInteractingRef.current = true;
        });
      
        controls.addEventListener("end", () => {
          isInteractingRef.current = false;
        });
      
        document.addEventListener("click", handleClickOutside);
      
        // Cleanup
        return () => {
          document.removeEventListener("click", handleClickOutside);
          if (controlsRef.current) {
            controlsRef.current.dispose();
          }
          cleanup();
        };
      } catch (error) {
        console.error("Three.js initialization error:", error);
        cleanup();
      }
    }, [shape, updateShape]);




    useEffect(() => {
      if (controlsRef.current) {
        controlsRef.current.enabled = Boolean(shape.isOrbiting);
      }
    }, [shape.isOrbiting]);

    return (
      <div
        ref={mountRef}
        className="w-full h-full"
        onDoubleClick={handleDoubleClick} // Add this line to connect the handler
        style={{
          cursor: shape.isOrbiting ? "grab" : "default",
          pointerEvents: "all",
        }}
      />
    );
  }
);