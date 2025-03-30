export interface Position {
  x: number;
  y: number;
}

export interface Shape {
  // Core properties
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
  width: number;
  height: number;
  originalWidth?: number;
  originalHeight?: number;
  color: string;
  rotation: number;
  isUploading: boolean;
  isEditing: boolean;
  isNew?: boolean;
  isResized?: boolean;
  model: string;
  useSettings: boolean;

  // Optional properties
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
  makeVariations?: boolean;
  variationStrength?: number;
  content?: string;
  fontSize?: number;
  imageUrl?: string;
  aspectRatio?: number;
  thumbnailUrl?: string;
  points?: Position[];
  strokeWidth?: number;
  showPrompt?: boolean;
  showNegativePrompt?: boolean;
  showContent?: boolean;
  showSketch?: boolean;
  showImagePrompt?: boolean;
  showDepth?: boolean;
  showEdges?: boolean;
  showPose?: boolean;
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
  isOrbiting?: boolean;
  camera?: {
    position: {
      x: number;
      y: number;
      z: number;
    };
    fov: number;
  };
  isTextPrompt?: boolean;
  isNegativePrompt?: boolean;
  sourceImageId?: string;
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
  contentStrength: number;
  sketchStrength: number;
  imagePromptStrength: number;
  depthStrength: number;
  edgesStrength: number;
  poseStrength: number;
  remixStrength?: number;
  isDrawing?: boolean;
  mergedFrom?: string[];
  isMerged?: boolean;
}

export interface DragStart {
  x: number;
  y: number;
  initialPositions: Map<string, Position>;
}

export interface ToolContext {
  type: 'image' | 'brush' | 'eraser' | 'inpaint' | null;
  shapeId?: string;
} 