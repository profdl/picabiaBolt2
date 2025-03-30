export interface Position {
  x: number;
  y: number;
}

// Base shape properties that all shapes share
export interface BaseShape {
  id: string;
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
  groupId?: string;
  isGroup?: boolean;
}

// Sticky note specific properties
export interface StickyNoteShape extends BaseShape {
  type: "sticky";
  content?: string;
  isTextPrompt?: boolean;
  isNegativePrompt?: boolean;
  textPromptStrength?: number;
  showPrompt?: boolean;
  showNegativePrompt?: boolean;
  showContent?: boolean;
}

// Image specific properties
export interface ImageShape extends BaseShape {
  type: "image";
  imageUrl?: string;
  aspectRatio?: number;
  thumbnailUrl?: string;
  showDepth?: boolean;
  showEdges?: boolean;
  showPose?: boolean;
  showSketch?: boolean;
  showImagePrompt?: boolean;
  depthMapUrl?: string;
  edgeMapUrl?: string;
  poseMapUrl?: string;
  sketchMapUrl?: string;
  depthPreviewUrl?: string;
  edgePreviewUrl?: string;
  posePreviewUrl?: string;
  sketchPreviewUrl?: string;
  imagePromptPreviewUrl?: string;
  isSketchProcessing?: boolean;
  isDepthProcessing?: boolean;
  isEdgeProcessing?: boolean;
  isPoseProcessing?: boolean;
  contentStrength: number;
  sketchStrength: number;
  imagePromptStrength: number;
  depthStrength: number;
  edgesStrength: number;
  poseStrength: number;
}

// Group specific properties
export interface GroupShape extends BaseShape {
  type: "group";
  groupEnabled: boolean;
}

// 3D specific properties
export interface ThreeDShape extends BaseShape {
  type: "3d";
  isOrbiting: boolean;
  camera: {
    position: {
      x: number;
      y: number;
      z: number;
    };
    fov: number;
  };
  depthMap?: string;
  displacementScale?: number;
  orbitControls: {
    autoRotate: boolean;
    autoRotateSpeed: number;
    enableZoom: boolean;
    enablePan: boolean;
  };
  lighting: {
    intensity: number;
    position: Position;
    color: string;
  };
}

// Other shape types
export interface RectangleShape extends BaseShape {
  type: "rectangle";
}

export interface CircleShape extends BaseShape {
  type: "circle";
}

export interface TextShape extends BaseShape {
  type: "text";
  content?: string;
  fontSize?: number;
}

export interface DrawingShape extends BaseShape {
  type: "drawing";
  points?: Position[];
  strokeWidth?: number;
  canvasData?: string;
  backgroundCanvasData?: string;
  permanentCanvasData?: string;
  activeCanvasData?: string;
  previewCanvasData?: string;
  maskCanvasData?: string;
  redBackgroundCanvasData?: string;
  sketchPadRef?: React.RefObject<HTMLCanvasElement>;
  isDrawing?: boolean;
}

export interface SketchpadShape extends BaseShape {
  type: "sketchpad";
  canvasData?: string;
  backgroundCanvasData?: string;
  permanentCanvasData?: string;
  activeCanvasData?: string;
  previewCanvasData?: string;
  maskCanvasData?: string;
  redBackgroundCanvasData?: string;
  sketchPadRef?: React.RefObject<HTMLCanvasElement>;
}

export interface DiffusionSettingsShape extends BaseShape {
  type: "diffusionSettings";
}

export interface DepthShape extends BaseShape {
  type: "depth";
}

export interface EdgesShape extends BaseShape {
  type: "edges";
}

export interface PoseShape extends BaseShape {
  type: "pose";
}

// Union type for all shapes
export type Shape =
  | StickyNoteShape
  | ImageShape
  | GroupShape
  | ThreeDShape
  | RectangleShape
  | CircleShape
  | TextShape
  | DrawingShape
  | SketchpadShape
  | DiffusionSettingsShape
  | DepthShape
  | EdgesShape
  | PoseShape;

export interface DragStart {
  x: number;
  y: number;
  initialPositions: Map<string, Position>;
}

export interface ToolContext {
  type: 'image' | 'brush' | 'eraser' | 'inpaint' | null;
  shapeId?: string;
} 