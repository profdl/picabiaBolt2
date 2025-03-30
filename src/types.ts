import { Shape } from './types/shapes';

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

export type { Shape } from './types/shapes';

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