import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { canvasSlice } from "./slices/canvasSlice";
import { drawerSlice } from "./slices/drawerSlice";
import { shapeSlice } from "./slices/shapeSlice";
import { toolSlice } from "./slices/toolSlice";
import { preProcessSlice } from "./slices/preProcessSlice";
import { uiSlice } from "./slices/uiSlice";
import { generationHandlerSlice } from "./slices/generationHandlerSlice";
import { subjectGenerationSlice } from "./slices/subjectGenerationSlice";
import { imageTrimSlice } from "./slices/imageTrimSlice";
import { warmupSlice } from './slices/warmupSlice';
import { GenerationSettingsSlice, generationSettingsSlice } from './slices/generationSettingsSlice';
import { GenerationServiceSlice, generationServiceSlice } from './slices/generationServiceSlice';
import { StoreState, GenerationService } from './types';

type State = {
  generationService: 'replicate' | 'comfyui';
  setGenerationService: (service: 'replicate' | 'comfyui') => void;
} & ReturnType<typeof warmupSlice> &
  ReturnType<typeof shapeSlice> &
  ReturnType<typeof canvasSlice> &
  ReturnType<typeof drawerSlice> &
  ReturnType<typeof toolSlice> &
  ReturnType<typeof preProcessSlice> &
  ReturnType<typeof uiSlice> &
  ReturnType<typeof generationHandlerSlice> &
  ReturnType<typeof subjectGenerationSlice> &
  ReturnType<typeof imageTrimSlice> &
  ReturnType<typeof generationSettingsSlice> &
  GenerationServiceSlice;

const initialState: Partial<StoreState> = {
  shapes: [],
  zoom: 1,
  offset: { x: 0, y: 0 },
  error: null,
  isGenerating: false,
  aspectRatio: '1:1',
  generatingPredictions: new Set(),
  generationService: 'replicate',
  hasActivePrompt: false,
};

export const useStore = create<State>()(
  devtools(
    (...a) => ({
      generationService: 'replicate' as const,
      setGenerationService: (service: 'replicate' | 'comfyui') =>
        a[0]({ generationService: service }),
      ...warmupSlice(...a),
      ...shapeSlice(...a),
      ...canvasSlice(...a),
      ...drawerSlice(...a),
      ...toolSlice(...a),
      ...preProcessSlice(...a),
      ...uiSlice(...a),
      ...generationHandlerSlice(...a),
      ...subjectGenerationSlice(...a),
      ...imageTrimSlice(...a),
      ...generationSettingsSlice(...a),
      ...generationServiceSlice(...a),
    }),
    { name: "PicabiaBolt Store" }
  )
);