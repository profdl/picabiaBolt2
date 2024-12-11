export interface Position {
  x: number;
  y: number;
}

export interface DragStart {
  x: number;
  y: number;
  initialPositions: Map<string, Position>;
}

export interface Project {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  user_id: string;
  shapes: Shape[];
  thumbnail: string | null;
}
export interface Shape {
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
    | "diffusionSettings";
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
  canvasData?: ImageData;
  isUploading: boolean;
  showDepth?: boolean;
  showEdges?: boolean;
  showContent?: boolean;
  showPose?: boolean;
  showScribble?: boolean;
  showRemix?: boolean;
  depthStrength: number;
  edgesStrength: number;
  contentStrength: number;
  poseStrength: number;
  scribbleStrength: number;
  remixStrength: number;
  groupId?: string;
  isGroup?: boolean;
  depthMapUrl?: string;
  edgeMapUrl?: string;
  poseMapUrl?: string;
  scribbleMapUrl?: string;
  remixMapUrl?: string;
  depthPreviewUrl?: string;
  edgePreviewUrl?: string;
  posePreviewUrl?: string;
  scribblePreviewUrl?: string;
  remixPreviewUrl?: string;
  isDepthProcessing?: boolean;
  isEdgeProcessing?: boolean;
  isPoseProcessing?: boolean;
  isScribbleProcessing?: boolean;
  isRemixProcessing?: boolean;
  hasDepthGenerated?: boolean;
  hasEdgeGenerated?: boolean;
  hasPoseGenerated?: boolean;
  hasScribbleGenerated?: boolean;
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
}

export interface CanvasState {
  shapes: Shape[];
  selectedShapes: string[];
  zoom: number;
  offset: Position;
  isDragging: boolean;
  tool: "select" | "pan" | "pen" | "brush" | "eraser";
  locked: boolean;
  history: Shape[][];
  historyIndex: number;
  gridEnabled: boolean;
  gridSize: number;
  clipboard: Shape[];
  currentColor: string;
  strokeWidth: number;
  isEraser: boolean;
  isEditingText: boolean;
  setIsEditingText: (isEditing: boolean) => void;
  setIsEraser: (isEraser: boolean) => void;
  setShapes: (shapes: Shape[]) => void;
  addShape: (shape: Shape) => void;
  addShapes: (shapes: Shape[]) => void;
  updateShape: (id: string, shape: Partial<Shape>) => void;
  updateShapes: (updates: { id: string; shape: Partial<Shape> }[]) => void;
  deleteShape: (id: string) => void;
  deleteShapes: (ids: string[]) => void;
  copyShapes: () => void;
  cutShapes: () => void;
  pasteShapes: (offset?: Position) => void;
  setSelectedShapes: (ids: string[]) => void;
  setZoom: (zoom: number, center?: Position) => void;
  setOffset: (offset: Position) => void;
  setIsDragging: (isDragging: boolean) => void;
  setTool: (tool: "select" | "pan" | "pen" | "brush" | "eraser") => void;
  setCurrentColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  undo: () => void;
  redo: () => void;
  toggleGrid: () => void;
}

export interface ContextMenuItem {
  label: string;
  action: () => void;
  icon?: React.ReactNode;
}

export interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

export interface WorkflowNode {
  inputs: Record<string, unknown>;
  class_type: string;
  _meta?: {
    title: string;
  };
}

export interface Workflow {
  [key: string]: WorkflowNode;
}

export interface UnsplashImage {
  id: string;
  urls: {
    regular: string;
    thumb: string;
  };
  alt_description: string;
  width: number;
  height: number;
}

export interface DrawerState {
  showAssets: boolean;
  unsplashQuery: string;
  unsplashImages: UnsplashImage[];
  unsplashLoading: boolean;
}

export interface StoreState {
  shapes: Shape[];
  addShape: (shape: Shape) => void;
  setSelectedShapes: (ids: string[]) => void;
  addGeneratingPrediction: (id: string) => void;
  removeGeneratingPrediction: (id: string) => void;
  updateShape: (id: string, props: Partial<Shape>) => void;
  error: string | null;
}
