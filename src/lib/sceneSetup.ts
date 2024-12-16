import * as THREE from "three";

interface SceneMetrics {
  aspectRatio: number;
  depthRange: {
    min: number;
    max: number;
  };
  estimatedDistance: number;
  recommendedFOV: number;
}

interface SceneSetupOptions {
  minFOV?: number;
  maxFOV?: number;
  baseDistance?: number;
  baseFOV?: number;
}

export function analyzeSceneMetrics(
  mainTexture: THREE.Texture,
  depthTexture: THREE.Texture,
  baseFOV: number = 60
): SceneMetrics {
  // Create temporary canvas to analyze depth texture
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");

  canvas.width = depthTexture.image.width;
  canvas.height = depthTexture.image.height;

  // Draw depth texture to analyze its values
  ctx.drawImage(depthTexture.image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Calculate depth range
  let minDepth = 255;
  let maxDepth = 0;
  for (let i = 0; i < data.length; i += 4) {
    const depth = data[i]; // Assuming grayscale depth map
    minDepth = Math.min(minDepth, depth);
    maxDepth = Math.max(maxDepth, depth);
  }

  const aspectRatio = mainTexture.image.width / mainTexture.image.height;
  const depthRange = maxDepth - minDepth;
  const estimatedDistance = 1 / (depthRange / 255);

  // Calculate recommended FOV based on scene analysis using baseFOV
  const fovMultiplier = Math.min(aspectRatio, 2) * (depthRange / 255);
  const recommendedFOV = baseFOV * fovMultiplier;

  return {
    aspectRatio,
    depthRange: { min: minDepth, max: maxDepth },
    estimatedDistance,
    recommendedFOV,
  };
}

export function setupScene(
  camera: THREE.PerspectiveCamera,
  plane: THREE.Mesh,
  mainTexture: THREE.Texture,
  depthTexture: THREE.Texture,
  options: SceneSetupOptions = {}
): void {
  const { minFOV = 30, maxFOV = 90, baseDistance = 2, baseFOV = 60 } = options;

  const metrics = analyzeSceneMetrics(mainTexture, depthTexture, baseFOV);

  // Update camera FOV based on estimation
  camera.fov = Math.min(maxFOV, Math.max(minFOV, metrics.recommendedFOV));

  // Adjust camera position based on estimated distance
  const adjustedDistance = baseDistance * metrics.estimatedDistance;
  camera.position.z = adjustedDistance;

  // Adjust plane position based on depth range
  const depthOffset = (metrics.depthRange.max - metrics.depthRange.min) / 255;
  plane.position.z = -depthOffset / 2;

  camera.updateProjectionMatrix();
}

// Type for the complete scene configuration
export interface SceneConfig {
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  plane: THREE.Mesh;
  metrics: SceneMetrics;
}

export function createSceneSetup(
  container: HTMLElement,
  width: number,
  height: number,
  baseFOV: number = 60
): SceneConfig {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    baseFOV,
    width / height,
    0.1,
    1000
  );

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.2,
    transparent: true,
    alphaTest: 0.5,
  });

  const plane = new THREE.Mesh(geometry, material);
  scene.add(plane);

  // Add default lighting
  const light = new THREE.DirectionalLight(0xffffff, 1.5);
  light.position.set(1, 1, 1);
  scene.add(light);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  container.appendChild(renderer.domElement);

  return {
    camera,
    scene,
    renderer,
    plane,
    metrics: {
      aspectRatio: width / height,
      depthRange: { min: 0, max: 255 },
      estimatedDistance: 1,
      recommendedFOV: baseFOV,
    },
  };
}
