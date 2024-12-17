import * as THREE from "three";

interface SceneMetrics {
  aspectRatio: number;
  depthRange: {
    min: number;
    max: number;
  };
  estimatedDistance: number;
  recommendedFOV: number;
  recommendedAngle: {
    x: number;
    y: number;
  };
  recommendedHeight: number;
}

interface SceneSetupOptions {
  displacementScale?: number;
  minFOV?: number;
  maxFOV?: number;
  baseDistance?: number;
  baseFOV?: number;
  maxAngle?: number;
  minHeight?: number;
  maxHeight?: number;
}

interface SceneConfig {
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  plane: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  metrics: SceneMetrics;
  dispose: () => void;
}

function createImprovedDisplacementMaterial(
  mainTexture: THREE.Texture,
  depthTexture: THREE.Texture,
  displacementScale: number = 1
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      mainTexture: { value: mainTexture },
      depthMap: { value: depthTexture },
      displacementScale: { value: displacementScale },
      cameraNear: { value: 0.1 },
      cameraFar: { value: 1000.0 },
      cameraPosition: { value: new THREE.Vector3() },
      viewMatrixInverse: { value: new THREE.Matrix4() },
    },
    vertexShader: `
      uniform sampler2D depthMap;
      uniform float displacementScale;
      uniform vec3 cameraPosition;
      uniform mat4 viewMatrixInverse;
      
      varying vec2 vUv;
      varying float vDepth;
      varying float vViewAngle;
      
      void main() {
        vUv = uv;
        
        // Sample depth map
        float depth = texture2D(depthMap, uv).r;
        vDepth = depth;
        
        // Get vertex position and normal in world space
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
        
        // Calculate view ray direction from camera to vertex
        vec3 viewDir = normalize(worldPos.xyz - cameraPosition);
        
        // Calculate angle between view ray and plane normal
        float viewAngle = abs(dot(viewDir, worldNormal));
        vViewAngle = viewAngle;
        
        // Adjust displacement scale based on view angle
        float angleCompensation = 1.0 / max(viewAngle, 0.1);
        
        // Calculate actual world space displacement along view ray
        float adjustedDepth = depth * displacementScale * angleCompensation;
        
        // Compute final displaced position along view ray
        vec3 displaced = position + viewDir * adjustedDepth * viewAngle;
        
        // Transform to clip space
        vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D mainTexture;
      uniform sampler2D depthMap;
      
      varying vec2 vUv;
      varying float vDepth;
      varying float vViewAngle;
      
      void main() {
        vec4 texColor = texture2D(mainTexture, vUv);
        
        // Optional: Enhance edge definition based on depth
        float depth = texture2D(depthMap, vUv).r;
        float edgeFactor = abs(depth - vDepth) * 10.0;
        
        // Adjust color based on view angle for debugging
        // vec3 debugColor = mix(texColor.rgb, vec3(vViewAngle), 0.2);
        
        vec3 edgeColor = mix(texColor.rgb, texColor.rgb * 0.8, edgeFactor);
        gl_FragColor = vec4(edgeColor, texColor.a);
      }
    `,
    side: THREE.DoubleSide,
    transparent: true,
  });
}

function analyzeDepthMapForOptimalParams(depthTexture: THREE.Texture): {
  suggestedDisplacementScale: number;
  depthComplexity: number;
  depthRange: { min: number; max: number };
} {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");

  canvas.width = depthTexture.image.width;
  canvas.height = depthTexture.image.height;
  ctx.drawImage(depthTexture.image, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let min = 255;
  let max = 0;
  let sum = 0;
  const values: number[] = [];

  for (let i = 0; i < data.length; i += 4) {
    const depth = data[i];
    min = Math.min(min, depth);
    max = Math.max(max, depth);
    sum += depth;
    values.push(depth);
  }

  const mean = sum / values.length;
  let sumSquares = 0;

  for (const depth of values) {
    const diff = depth - mean;
    sumSquares += diff * diff;
  }

  const variance = sumSquares / values.length;
  const stdDev = Math.sqrt(variance);

  // Calculate depth complexity based on standard deviation
  const depthComplexity = stdDev / 255;

  // Suggest displacement scale based on analysis
  let suggestedDisplacementScale = 0.5; // Base scale

  // Adjust for depth range
  const depthRange = max - min;
  const normalizedRange = depthRange / 255;
  suggestedDisplacementScale *= 1 + normalizedRange;

  // Adjust for complexity
  suggestedDisplacementScale *= 1 + depthComplexity;

  // Clamp to reasonable range
  suggestedDisplacementScale = Math.max(
    0.1,
    Math.min(2.0, suggestedDisplacementScale)
  );

  return {
    suggestedDisplacementScale,
    depthComplexity,
    depthRange: { min, max },
  };
}

function analyzeSceneMetrics(
  mainTexture: THREE.Texture,
  depthTexture: THREE.Texture,
  baseFOV: number = 60
): SceneMetrics {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");

  canvas.width = depthTexture.image.width;
  canvas.height = depthTexture.image.height;
  ctx.drawImage(depthTexture.image, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let minDepth = 255;
  let maxDepth = 0;
  let totalDepth = 0;

  for (let i = 0; i < data.length; i += 4) {
    const depth = data[i];
    minDepth = Math.min(minDepth, depth);
    maxDepth = Math.max(maxDepth, depth);
    totalDepth += depth;
  }

  const avgDepth = totalDepth / (data.length / 4);
  const depthRange = maxDepth - minDepth;
  const estimatedDistance = 1 + (avgDepth / 255) * 2;

  // Calculate recommended angle based on depth distribution
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  let xSum = 0;
  let ySum = 0;
  let count = 0;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4;
      const depth = data[idx];
      const xDiff = (x - centerX) / centerX;
      const yDiff = (y - centerY) / centerY;
      xSum += xDiff * depth;
      ySum += yDiff * depth;
      count++;
    }
  }

  const aspectRatio = mainTexture.image.width / mainTexture.image.height;
  const recommendedFOV = baseFOV * (1 + (depthRange / 255) * 0.5);

  return {
    aspectRatio,
    depthRange: { min: minDepth, max: maxDepth },
    estimatedDistance,
    recommendedFOV,
    recommendedAngle: {
      x: Math.atan2(xSum, count * 255) * 0.5,
      y: Math.atan2(ySum, count * 255) * 0.5,
    },
    recommendedHeight: 0.5 + (avgDepth / 255) * 0.5,
  };
}

export function setupScene(
  camera: THREE.PerspectiveCamera,
  plane: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>,
  mainTexture: THREE.Texture,
  depthTexture: THREE.Texture,
  options: SceneSetupOptions = {}
): void {
  const {
    displacementScale,
    minFOV = 60, // Increased for wider default view
    maxFOV = 90,
    baseDistance = 0.05, // Made much smaller from 0.2
    baseFOV = 75, // Increased for wider default view
    maxAngle = 25,
    minHeight = 0.01, // Decreased for closer positioning
    maxHeight = 0.1, // Decreased for closer positioning
  } = options;

  const metrics = analyzeSceneMetrics(mainTexture, depthTexture, baseFOV);
  const analysis = analyzeDepthMapForOptimalParams(depthTexture);
  const finalDisplacementScale =
    displacementScale ?? analysis.suggestedDisplacementScale;

  // Create higher resolution geometry for smoother displacement
  const aspect = mainTexture.image.width / mainTexture.image.height;
  const baseSegments = Math.max(128, Math.floor(mainTexture.image.width / 16));
  const geometry = new THREE.PlaneGeometry(
    aspect,
    1,
    Math.max(256, baseSegments), // Increased from 128
    Math.floor(Math.max(256, baseSegments) / aspect)
  );

  // Create and set up the improved material
  const material = createImprovedDisplacementMaterial(
    mainTexture,
    depthTexture,
    finalDisplacementScale
  );

  // Update plane mesh
  plane.geometry.dispose();
  plane.geometry = geometry;
  plane.material.dispose();
  plane.material = material;

  // Set up optimal camera position based on depth analysis
  camera.fov = THREE.MathUtils.clamp(metrics.recommendedFOV, minFOV, maxFOV);

  const adjustedDistance = baseDistance * metrics.estimatedDistance;
  const maxAngleRad = THREE.MathUtils.degToRad(maxAngle);

  // Calculate optimal camera angles based on depth map analysis
  const xAngle = THREE.MathUtils.clamp(
    metrics.recommendedAngle.x,
    -maxAngleRad,
    maxAngleRad
  );
  const yAngle = THREE.MathUtils.clamp(
    metrics.recommendedAngle.y,
    -maxAngleRad,
    maxAngleRad
  );

  // Calculate optimal height
  const height = THREE.MathUtils.clamp(
    metrics.recommendedHeight,
    minHeight,
    maxHeight
  );

  // Position camera optimally
  camera.position.set(
    Math.sin(yAngle) * adjustedDistance,
    height * adjustedDistance,
    Math.cos(Math.max(Math.abs(xAngle), Math.abs(yAngle))) * adjustedDistance
  );

  // Calculate target point based on depth map analysis
  const depthOffset = (metrics.depthRange.max - metrics.depthRange.min) / 255;
  const target = new THREE.Vector3(
    0,
    height * 0.25,
    -depthOffset * finalDisplacementScale
  );

  camera.lookAt(target);
  camera.updateProjectionMatrix();

  // Update uniforms
  material.uniforms.cameraPosition.value.copy(camera.position);
  material.uniforms.cameraNear.value = camera.near;
  material.uniforms.cameraFar.value = camera.far;
  camera.updateMatrixWorld();
  material.uniforms.viewMatrixInverse.value.copy(camera.matrixWorld);
}

export function createSceneSetup(
  container: HTMLElement,
  width: number,
  height: number,
  baseFOV: number = 60
): SceneConfig {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(baseFOV, width / height, 0.1, 10);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = createImprovedDisplacementMaterial(
    new THREE.Texture(), // Placeholder textures will be updated later
    new THREE.Texture(),
    0.5
  );

  const plane = new THREE.Mesh(geometry, material);
  scene.add(plane);

  // Lighting setup

  const fillLight = new THREE.DirectionalLight(0xffd7ba, 1.2);
  fillLight.position.set(-1, 0.5, -1);
  scene.add(fillLight);
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
  mainLight.position.set(2, 3, 1);
  const target = new THREE.Object3D();
  target.position.set(0, 0, -1);
  mainLight.add(target);
  mainLight.target = target;
  scene.add(mainLight);

  const backLight = new THREE.DirectionalLight(0xb6d0ff, 0.8);
  backLight.position.set(0, 1, -2);
  scene.add(backLight);
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  container.appendChild(renderer.domElement);

  const dispose = () => {
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    container.removeChild(renderer.domElement);
  };

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
      recommendedAngle: { x: 0, y: 0 },
      recommendedHeight: 0.5,
    },
    dispose,
  };
}
