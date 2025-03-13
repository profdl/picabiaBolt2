export interface Position {
  x: number;
  y: number;
}

export interface Shape {
  assetId?: string;
  onClear?: () => void;
  isCleared?: boolean;
  canvasData?: string;
  sketchPadRef?: React.RefObject<HTMLCanvasElement>;
  isImageEditing?: boolean;
  isProcessingSubject?: boolean;
  subjectPreviewUrl?: string;
  hasSubjectGenerated?: boolean;
  getCanvasImage?: () => string | undefined;
  locked?: boolean;
  isEditing: boolean;
  isNew?: boolean;
  model: string;
  useSettings: boolean;
  id: string;
  type:
    | "rectangle"
    | "circle"
    | "text"
    | "sticky"
    | "image"
    | "drawing"
    | "sketchpad"
    | "group"
    | "diffusionSettings"
    | "3d";
  position: Position;
  content?: string;
  width: number;
  height: number;
  color: string;
  fontSize?: number;
  imageUrl?: string;
  aspectRatio?: number;
  originalWidth?: number;
  originalHeight?: number;
  thumbnailUrl?: string;
  rotation: number;
  points?: Position[];
  strokeWidth?: number;
  showPrompt?: boolean;
  showNegativePrompt?: boolean;
  isUploading: boolean;
  showDepth?: boolean;
  showEdges?: boolean;
  showContent?: boolean;
  showPose?: boolean;
  showSketch?: boolean;
  showRemix?: boolean;
  depthStrength: number;
  edgesStrength: number;
  contentStrength: number;
  poseStrength: number;
  sketchStrength: number;
  remixStrength: number;
  groupId?: string;
  isGroup?: boolean;
  depthMapUrl?: string;
  edgeMapUrl?: string;
  poseMapUrl?: string;
  sketchMapUrl?: string;
  remixMapUrl?: string;
  depthPreviewUrl?: string;
  edgePreviewUrl?: string;
  posePreviewUrl?: string;
  sketchPreviewUrl?: string;
  remixPreviewUrl?: string;
  isDepthProcessing?: boolean;
  isEdgeProcessing?: boolean;
  isPoseProcessing?: boolean;
  isSketchProcessing?: boolean;
  isRemixProcessing?: boolean;
  hasDepthGenerated?: boolean;
  hasEdgeGenerated?: boolean;
  hasPoseGenerated?: boolean;
  hasSketchGenerated?: boolean;
  hasRemixGenerated?: boolean;
  scheduler?: string;
  seed?: number;
  steps?: number;
  guidanceScale?: number;
  outputFormat?: string;
  outputQuality?: number;
  randomiseSeeds?: boolean;
  negativePrompt?: string;
  outputWidth?: number;
  outputHeight?: number;
  mergedFrom?: string[];
  isMerged?: boolean;  
  // 3D specific properties
  depthMap?: string;
  displacementScale?: number;
  orbitControls?: {
    autoRotate?: boolean;
    autoRotateSpeed?: number;
    enableZoom?: boolean;
    enablePan?: boolean;
  };
  lighting?: {
    intensity?: number;
    position?: Position;
    color?: string;
  };
  camera?: {
    position?: Position & { z: number };
    fov?: number;
  };
  isOrbiting?: boolean;
  lastUpdated?: string;
}

export interface DragStart {
  x: number;
  y: number;
  initialPositions: Map<string, Position>;
}

export interface ToolContext {
  type: 'image' | 'brush' | 'eraser' | null;
  shapeId?: string;
} 