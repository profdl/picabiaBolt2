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
  type: 'rectangle' | 'circle' | 'text' | 'sticky' | 'image' | 'drawing' | 'canvas' | 'group';
  position: Position;
  content?: string;
  width: number;
  height: number;
  color: string;
  fontSize?: number;
  imageUrl?: string;
  aspectRatio?: number;
  rotation: number;
  points?: Position[];
  strokeWidth?: number;
  showPrompt?: boolean;
  canvasData?: ImageData;
  isUploading: boolean;
  showDepth?: boolean;
  showEdges?: boolean;
  showContent?: boolean;
  showPose?: boolean;
  depthStrength?: number;
  edgesStrength?: number;
  contentStrength?: number;
  poseStrength?: number;
  groupId?: string;
  isGroup?: boolean;
  depthMapUrl?: string;
  edgeMapUrl?: string;
  poseMapUrl?: string;
  depthPreviewUrl?: string;
  edgePreviewUrl?: string;
  posePreviewUrl?: string;
  isDepthProcessing?: boolean;
  isEdgeProcessing?: boolean;
  isPoseProcessing?: boolean;
  hasDepthGenerated?: boolean;
  hasEdgeGenerated?: boolean;
  hasPoseGenerated?: boolean;
  model?: string;
  steps?: number;
  guidanceScale?: number;
}
export interface CanvasState {
  shapes: Shape[];
  selectedShapes: string[];
  zoom: number;
  offset: Position;
  isDragging: boolean;
  tool: 'select' | 'pan' | 'pen' | 'brush';
  history: Shape[][];
  historyIndex: number;
  gridEnabled: boolean;
  gridSize: number;
  clipboard: Shape[];
  currentColor: string;
  strokeWidth: number;
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
  setTool: (tool: 'select' | 'pan' | 'pen' | 'brush') => void;
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