export interface Position {
  x: number;
  y: number;
}

export interface DragStart {
  x: number;
  y: number;
  initialPositions: Map<string, Position>;
}

export interface Shape {
  id: string;
  type: "drawing" | "image" | "text" | "sticky" | "3d" | "sketchpad" | "diffusionSettings" | "group" | "depth" | "edges" | "pose";
  position: Position;
  width: number;
  height: number;
  color?: string;
  points?: Position[];
  strokeWidth?: number;
  rotation?: number;
  isUploading?: boolean;
  model?: string;
  useSettings?: boolean;
  groupEnabled?: boolean;
  stickyStates?: { [shapeId: string]: { isTextPrompt: boolean; isNegativePrompt: boolean } };
  contentStrength?: number;
  sketchStrength?: number;
  imagePromptStrength?: number;
  textPromptStrength?: number;
  depthStrength?: number;
  edgesStrength?: number;
  poseStrength?: number;
  isEditing?: boolean;
  content?: string;
  imageUrl?: string;
  isOrbiting?: boolean;
  camera?: {
    position: {
      x: number;
      y: number;
      z: number;
    };
    fov: number;
  };
  isNew?: boolean;
  isTextPrompt?: boolean;
  isNegativePrompt?: boolean;
  groupId?: string;
  onClear?: () => void;
  sourceImageId?: string;
  showSketch?: boolean;
  showImagePrompt?: boolean;
  showContent?: boolean;
  showDepth?: boolean;
  showEdges?: boolean;
  showPose?: boolean;
  showPrompt?: boolean;
  showNegativePrompt?: boolean;
  sketchMapUrl?: string;
  imagePromptMapUrl?: string;
  depthMapUrl?: string;
  edgeMapUrl?: string;
  poseMapUrl?: string;
  sketchPreviewUrl?: string;
  imagePromptPreviewUrl?: string;
  depthPreviewUrl?: string;
  edgePreviewUrl?: string;
  posePreviewUrl?: string;
  isSketchProcessing?: boolean;
  isImagePromptProcessing?: boolean;
  isDepthProcessing?: boolean;
  isEdgeProcessing?: boolean;
  isPoseProcessing?: boolean;
  hasSketchGenerated?: boolean;
  hasImagePromptGenerated?: boolean;
  hasDepthGenerated?: boolean;
  hasEdgeGenerated?: boolean;
  hasPoseGenerated?: boolean;
  // Generation settings
  steps?: number;
  guidanceScale?: number;
  scheduler?: string;
  seed?: number;
  outputWidth?: number;
  outputHeight?: number;
  outputFormat?: string;
  outputQuality?: number;
  randomiseSeeds?: boolean;
  // Canvas data
  canvasData?: string;
  // Additional properties
  aspectRatio?: number;
  assetId?: string;
  depthMap?: string;
  displacementScale?: number;
  orbitControls?: {
    autoRotate: boolean;
    autoRotateSpeed: number;
    enableZoom: boolean;
    enablePan: boolean;
  };
  lighting?: {
    intensity: number;
    position: { x: number; y: number };
    color: string;
  };
}

export interface SavedImage {
  id: string;
  user_id: string;
  image_url: string;
  prompt: string;
  aspect_ratio: number;
  created_at: string;
  // ... existing code ...
} 