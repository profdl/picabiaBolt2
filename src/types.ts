export interface Asset {
  id: string;
  url: string;
  created_at: string;
  user_id: string;
  width?: number;
  height?: number;
  depthStrength?: number;
  edgesStrength?: number;
  poseStrength?: number;
  sketchStrength?: number;
  remixStrength?: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface ToolContext {
  type: 'image' | 'brush' | 'eraser' | null;
  shapeId?: string;
}

export interface DragStart {
  x: number;
  y: number;
  initialPositions: Map<string, Position>;
}

export interface Project {
  is_template: boolean | undefined;
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  user_id: string;
  shapes: Shape[];
  thumbnail: string | null;
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

export interface SavedImage {
  id: string;
  user_id: string;
  prompt: string;
  aspect_ratio: string;
  created_at: string;
  prediction_id: string;
  status: "generating" | "completed" | "failed";
  updated_at: string;
  image_index: number;
  originalUrl: string;
  depthMapUrl: string;
  edgeMapUrl: string;
  poseMapUrl: string;
  generated_01: string;
  generated_02: string;
  generated_03: string;
  generated_04: string;
  model: string;
  output_format: 'png' | 'jpg';
  output_quality: number;
  randomise_seeds: boolean;
  error_message?: string;
  num_inference_steps: number;
  prompt_negative: string;
  width: number;
  height: number;
  num_outputs: number;
  scheduler: string;
  guidance_scale: number;
  prompt_strength: number;
  seed: number;
  refine: boolean;
  refine_steps: number;
  lora_scale: number;
  lora_weights: string;
  depth_scale: number;
  edge_scale: number;
  pose_scale: number;
  sketchMapUrl: string;
  sketch_scale: number;
  remixMapUrl: string;
  remix_scale: number;
  logs: string;
}

export interface SourcePlusImage {
  id: string;
  url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  description?: string;
  author?: {
    name?: string;
    username?: string;
  };
}

export interface DetailedSavedImage {
  id: string;
  generated_01: string;
  prompt: string;
  created_at: string;
  status: "generating" | "completed" | "failed";
  aspect_ratio: string;
  user_id?: string;
  prediction_id?: string;
  image_index?: number;
}


export interface CanvasState {
  activeToolContext: ToolContext;
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
  create3DDepth: (sourceShape: Shape) => void;
  isOrbiting?: boolean;
  mergeImages: (shapeIds: string[]) => Promise<void>; 
}

export interface ArenaBlock {
  id: number;
  title: string;
  content: string;
  description: string;
  image: {
    original: {
      url: string;
    };
    display: {
      url: string;
    };
  };
  created_at: string;
  updated_at: string;
  class: string;
  source: {
    url: string;
    title: string;
  };
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
  create3DDepth: (shape: Shape, position: { x: number; y: number }) => void;
}

export interface ThreeJSShapeRef {
  exportToGLTF: () => void;
}

export interface ContextMenuActions {
  sendBackward: () => void;
  sendForward: () => void;
  sendToBack: () => void;
  sendToFront: () => void;
  duplicate: () => void;
  deleteShape: (id: string) => void;
  createGroup: (ids: string[]) => void;
  ungroup: (id: string) => void;
  mergeImages: (ids: string[]) => void; // Add this line
}