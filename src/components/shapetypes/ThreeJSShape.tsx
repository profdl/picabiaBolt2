import { FC, useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Shape } from "../../types";
import { useStore } from "../../store";

interface ThreeJSShapeProps {
  shape: Shape;
}

export const ThreeJSShape: FC<ThreeJSShapeProps> = ({ shape }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const { updateShape } = useStore();

  useEffect(() => {
    if (!mountRef.current || !shape.imageUrl || !shape.depthMap) return;

    let renderer = rendererRef.current;

    if (!renderer) {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
      });
      rendererRef.current = renderer;
    }

    const mountElement = mountRef.current;
    mountElement.innerHTML = "";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      shape.camera?.fov || 75,
      shape.width / shape.height,
      0.1,
      1000
    );

    renderer.setSize(shape.width, shape.height);
    mountElement.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      map: new THREE.TextureLoader().load(shape.imageUrl),
      displacementMap: new THREE.TextureLoader().load(shape.depthMap),
      displacementScale: shape.displacementScale || 0.5,
      side: THREE.DoubleSide,
    });

    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    const aspectRatio = shape.width / shape.height;
    const fov = shape.camera?.fov || 75;
    const distance = 1 / Math.tan(((fov / 2) * Math.PI) / 180);
    camera.position.set(
      shape.camera?.position?.x || 0,
      shape.camera?.position?.y || 0,
      shape.camera?.position?.z || distance
    );

    camera.aspect = aspectRatio;
    camera.updateProjectionMatrix();

    const sceneScale =
      Math.min(shape.width, shape.height) / Math.max(shape.width, shape.height);
    scene.scale.set(sceneScale, sceneScale, sceneScale);

    const controls = new OrbitControls(camera, renderer.domElement);

    controls.enabled = Boolean(shape.isOrbiting);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 1, 1);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Handle clicking outside to exit orbit mode
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

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
        rendererRef.current = null;
      }
    };
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
};
