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
    | "3d"
    | "depth"
    | "edges"
    | "pose";
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
  showContent?: boolean;
  showSketch?: boolean;
  showRemix?: boolean;
  showDepth?: boolean;
  showEdges?: boolean;
  showPose?: boolean;
  contentStrength: number;
  sketchStrength: number;
  remixStrength: number;
  depthStrength: number;
  edgesStrength: number;
  poseStrength: number;
  groupId?: string;
  isGroup?: boolean;
  sketchMapUrl?: string;
  remixMapUrl?: string;
  depthMapUrl?: string;
  edgeMapUrl?: string;
  poseMapUrl?: string;
  sketchPreviewUrl?: string;
  remixPreviewUrl?: string;
  depthPreviewUrl?: string;
  edgePreviewUrl?: string;
  posePreviewUrl?: string;
  isSketchProcessing?: boolean;
  isRemixProcessing?: boolean;
  isDepthProcessing?: boolean;
  isEdgeProcessing?: boolean;
  isPoseProcessing?: boolean;
  hasSketchGenerated?: boolean;
  hasRemixGenerated?: boolean;
  hasDepthGenerated?: boolean;
  hasEdgeGenerated?: boolean;
  hasPoseGenerated?: boolean;
  scheduler?: string;
  seed?: number;
  steps?: number;
  guidanceScale?: number;
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