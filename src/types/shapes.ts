export interface Position {
  x: number;
  y: number;
}

export interface Shape {
  assetId?: string;
  onClear?: () => void;
  isCleared?: boolean;
  canvasData?: string;
  backgroundCanvasData?: string;
  permanentCanvasData?: string;
  activeCanvasData?: string;
  previewCanvasData?: string;
  maskCanvasData?: string;
  redBackgroundCanvasData?: string;
  sketchPadRef?: React.RefObject<HTMLCanvasElement>;
  isImageEditing?: boolean;
  isProcessingSubject?: boolean;
  subjectPreviewUrl?: string;
  hasSubjectGenerated?: boolean;
  getCanvasImage?: () => string | undefined;
  locked?: boolean;
  isEditing: boolean;
  isNew?: boolean;
  isResized?: boolean;
  model: string;
  useSettings: boolean;
  makeVariations?: boolean;
  variationStrength?: number;
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
    | "pose"
    | "stickyNote";
  position: Position;
  content?: string;
  width: number;
  height: number;
  originalWidth?: number;
  originalHeight?: number;
  color: string;
  fontSize?: number;
  imageUrl?: string;
  aspectRatio?: number;
  thumbnailUrl?: string;
  rotation: number;
  points?: Position[];
  strokeWidth?: number;
  showPrompt?: boolean;
  showNegativePrompt?: boolean;
  isUploading: boolean;
  showContent?: boolean;
  showSketch?: boolean;
  showImagePrompt?: boolean;
  showDepth?: boolean;
  showEdges?: boolean;
  showPose?: boolean;
  contentStrength: number;
  sketchStrength: number;
  imagePromptStrength: number;
  depthStrength: number;
  edgesStrength: number;
  poseStrength: number;
  groupId?: string;
  isGroup?: boolean;
  sketchMapUrl?: string;
  depthMapUrl?: string;
  edgeMapUrl?: string;
  poseMapUrl?: string;
  sketchPreviewUrl?: string;
  depthPreviewUrl?: string;
  edgePreviewUrl?: string;
  posePreviewUrl?: string;
  isSketchProcessing?: boolean;
  isDepthProcessing?: boolean;
  isEdgeProcessing?: boolean;
  isPoseProcessing?: boolean;
  depthUrl?: string;
  edgeUrl?: string;
  poseUrl?: string;
  hasSketchGenerated?: boolean;
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