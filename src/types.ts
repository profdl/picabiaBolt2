export interface Position {
  x: number;
  y: number;
}

export interface Shape {
  id: string;
  type: 'rectangle' | 'circle' | 'text' | 'sticky' | 'image' | 'drawing' | 'canvas';
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
  getCanvasImage?: () => string; // Added property
  promptStrength?: number;
}


export interface Project {
  id: string;
  name: string;
  thumbnail?: string | null;

  updated_at: string;

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
  setZoom: (zoom: number) => void;
  setOffset: (offset: Position) => void;
  setIsDragging: (isDragging: boolean) => void;
  setTool: (tool: 'select' | 'pan' | 'pen' | 'brush') => void;
  setCurrentColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  undo: () => void;
  redo: () => void;
  toggleGrid: () => void;
}