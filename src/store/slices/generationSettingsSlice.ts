import { StateCreator } from 'zustand';
import { StoreState } from '../types';

export type GenerationService = 'replicate' | 'comfyui';

export interface GenerationSettingsSlice {
  generationService: GenerationService;
  setGenerationService: (service: GenerationService) => void;
}

export const generationSettingsSlice: StateCreator<
  StoreState & GenerationSettingsSlice,
  [],
  [],
  GenerationSettingsSlice
> = (set) => ({
  generationService: 'replicate', // Default to replicate
  setGenerationService: (service) => set({ generationService: service }),
}); 