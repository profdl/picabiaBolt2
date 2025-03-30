export interface Position {
  x: number;
  y: number;
}

export interface DragStart {
  x: number;
  y: number;
  initialPositions: Map<string, Position>;
}

export interface ContextMenuItem {
  label: string;
  action: () => void;
  icon: React.ReactElement;
}

export interface Shape {
  id: string;
  type: "drawing" | "image" | "text" | "sticky" | "3d" | "sketchpad" | "diffusionSettings" | "group" | "depth" | "edges" | "pose";
  position: Position;
  width: number;
  height: number;
  originalWidth?: number;
  originalHeight?: number;
  color?: string;
  fontSize?: number;
  points?: Position[];
  strokeWidth?: number;
  rotation?: number;
  isUploading?: boolean;
  model?: string;
  useSettings?: boolean;
  groupEnabled?: boolean;
  mergedFrom?: string[];
  isMerged?: boolean;
  remixStrength?: number;
  isDrawing?: boolean;
  savedCanvasState?: {
    backgroundData?: string;
    permanentStrokesData?: string;
    activeStrokeData?: string;
    maskData?: string;
    previewData?: string;
  };
  stickyStates?: { [shapeId: string]: { isTextPrompt: boolean; isNegativePrompt: boolean } };
  controlStates?: { [shapeId: string]: {
    isTextPrompt: boolean;
    isNegativePrompt: boolean;
    showImagePrompt: boolean;
    showDepth: boolean;
    showEdges: boolean;
    showPose: boolean;
    showContent: boolean;
    showSketch: boolean;
    useSettings: boolean;
    color?: string;
  } };
  contentStrength?: number;
  sketchStrength?: number;
  imagePromptStrength?: number;
  textPromptStrength?: number;
  depthStrength?: number;
  edgesStrength?: number;
  poseStrength?: number;
  isEditing?: boolean;
  isImageEditing?: boolean;
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
  backgroundCanvasData?: string;
  permanentCanvasData?: string;
  activeCanvasData?: string;
  previewCanvasData?: string;
  maskCanvasData?: string;
  redBackgroundCanvasData?: string;
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
  makeVariations?: boolean;
  variationStrength?: number;
  depthUrl?: string;
  edgeUrl?: string;
  poseUrl?: string;
  showAdvanced?: boolean;
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

export interface Project {
  id: string;
  name: string;
  shapes: Shape[];
  thumbnail: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_template: boolean;
}

export interface StoreState {
  shapes: Shape[];
  selectedShapes: string[];
  error: string | null;
  generatingPredictions: string[];
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  removeShape: (id: string) => void;
  setSelectedShapes: (ids: string[]) => void;
  setError: (error: string | null) => void;
  addGeneratingPrediction: (id: string) => void;
  removeGeneratingPrediction: (id: string) => void;
} 