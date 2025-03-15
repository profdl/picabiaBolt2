import { Shape, Position } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

export type GenerationService = 'replicate' | 'comfyui';

export interface StoreState {
  shapes: Shape[];
  zoom: number;
  offset: Position;
  error: string | null;
  isGenerating: boolean;
  aspectRatio: string;
  generatingPredictions: Set<string>;
  generationService: GenerationService;
  addShape: (shape: Shape) => void;
  updateShape: (id: string, props: Partial<Shape>) => void;
  setSelectedShapes: (ids: string[]) => void;
  centerOnShape: (id: string) => void;
  addGeneratingPrediction: (id: string) => void;
  removeGeneratingPrediction: (id: string) => void;
  setError: (error: string | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setGenerationService: (service: GenerationService) => void;
  hasActivePrompt: boolean;
} 