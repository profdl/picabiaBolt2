import { StateCreator } from 'zustand';
import { StoreState } from '../types';

export type GenerationService = 'replicate' | 'comfyui';

export interface GenerationServiceSlice {
  generationService: GenerationService;
  setGenerationService: (service: GenerationService) => void;
}

export const generationServiceSlice: StateCreator<
  StoreState & GenerationServiceSlice,
  [],
  [],
  GenerationServiceSlice
> = (set) => ({
  generationService: 'replicate',
  setGenerationService: (service) => set({ generationService: service }),
}); 