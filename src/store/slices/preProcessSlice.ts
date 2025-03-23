import { StateCreator } from "zustand";
import { Shape } from "../../types";
import { supabase } from "../../lib/supabase";

interface GenerationState {
  shapes: Shape[];
  error: string | null;
  setError: (error: string | null) => void;
  updateShape: (id: string, props: Partial<Shape>) => void;
}

interface AdvancedSettings {
  width: number;
  height: number;
  isHorizontal: boolean;
  model: string;
  randomiseSeeds: unknown;
  outputQuality: unknown;
  outputFormat: unknown;
  negativePrompt: string;
  numInferenceSteps: number;
  guidanceScale: number;
  scheduler: string;
  seed: number;
  steps: number;
}

interface PreprocessingStates {
  [shapeId: string]: {
    depth?: boolean;
    edge?: boolean;
    pose?: boolean;
    sketch?: boolean;
    imagePrompt?: boolean;
  };
}

interface PreProcessSlice {
  isGenerating: boolean;
  showImageGenerate: boolean;
  error: string | null;
  generatingPredictions: Set<string>;
  advancedSettings: AdvancedSettings;
  preprocessingStates: PreprocessingStates;
  generatePreprocessedImage: (
    shapeId: string,
    processType: "depth" | "edge" | "pose" | "sketch" | "imagePrompt"
  ) => Promise<void>;
  addGeneratingPrediction: (id: string) => void;
  removeGeneratingPrediction: (id: string) => void;
  setAdvancedSettings: (settings: Partial<AdvancedSettings>) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  toggleImageGenerate: () => void;
  setError: (error: string | null) => void;
}

export const preProcessSlice: StateCreator<
  GenerationState & PreProcessSlice,
  [],
  [],
  PreProcessSlice
> = (set, get) => ({
  isGenerating: false,
  showImageGenerate: false,
  error: null,
  generatingPredictions: new Set<string>(),
  preprocessingStates: {},
  advancedSettings: {
    steps: 30,
    guidanceScale: 4.5,
    scheduler: "dpmpp_2m_sde",
    seed: -1,
    outputFormat: "png",
    outputQuality: 95,
    randomiseSeeds: true,
    negativePrompt: "",
    width: 1360,
    height: 768,
    isHorizontal: false,
    model: "",
    numInferenceSteps: 0,
  },

  setAdvancedSettings: (settings) =>
    set((state) => ({
      advancedSettings: { ...state.advancedSettings, ...settings },
    })),

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  toggleImageGenerate: () =>
    set((state) => ({
      showImageGenerate: !state.showImageGenerate,
    })),

  setError: (error) => set({ error }),

  addGeneratingPrediction: (id) =>
    set((state) => ({
      generatingPredictions: new Set([...state.generatingPredictions, id]),
    })),

  removeGeneratingPrediction: (id) =>
    set((state) => {
      const newPredictions = new Set(state.generatingPredictions);
      newPredictions.delete(id);
      return { generatingPredictions: newPredictions };
    }),

  generatePreprocessedImage: async (shapeId, processType) => {
    console.log("Starting preprocessing:", { shapeId, processType });
    const state = get();

    // Skip processing for imagePrompt
    if (processType === "imagePrompt") {
      return;
    }

    try {
      const shape = state.shapes.find((s) => s.id === shapeId);
      if (!shape?.imageUrl) {
        throw new Error("No image URL found for shape");
      }

      // Get the preview canvas for the shape
      const previewCanvas = document.querySelector(`canvas[data-shape-id="${shapeId}"][data-layer="preview"]`) as HTMLCanvasElement;
      if (!previewCanvas) {
        throw new Error("Preview canvas not found for shape");
      }

      // Create a blob from the preview canvas
      const blob = await new Promise<Blob>((resolve, reject) => {
        previewCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from preview canvas'));
          }
        }, 'image/png', 1.0);
      });

      // Upload to Supabase
      const fileName = `preprocess_source_${Math.random().toString(36).substring(2)}.png`;
      const arrayBuffer = await blob.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(fileName, fileData, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("assets")
        .getPublicUrl(fileName);

      // Set preprocessing state immediately
      set((state) => ({
        preprocessingStates: {
          ...state.preprocessingStates,
          [shapeId]: {
            ...state.preprocessingStates[shapeId],
            [processType]: true,
          },
        },
      }));

      // Make API call with the preview canvas URL
      const response = await fetch("/.netlify/functions/preprocess-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: publicUrl,
          processType,
          shapeId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      // No need to wait for subscription confirmation
      console.log("Preprocessing API call successful");
    } catch (error) {
      console.error("Error in preprocessing:", error);
      set((state) => ({
        error:
          error instanceof Error ? error.message : "Failed to preprocess image",
        preprocessingStates: {
          ...state.preprocessingStates,
          [shapeId]: {
            ...state.preprocessingStates[shapeId],
            [processType]: false,
          },
        },
      }));
    }
  },
});
