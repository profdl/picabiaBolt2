import { StateCreator } from 'zustand';
import { Shape } from '../../types';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface PreprocessingPayload {
    new: {
        status: string;
        output_url: string;
        shape_id: string;
    };
}
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
        scribble?: boolean;
        remix?: boolean;
    };
}

interface GenerationSlice {
    isGenerating: boolean;
    showImageGenerate: boolean;
    error: string | null;
    generatingPredictions: Set<string>;
    advancedSettings: AdvancedSettings;
    preprocessingStates: PreprocessingStates;
    generatePreprocessedImage: (shapeId: string, processType: 'depth' | 'edge' | 'pose' | 'scribble' | 'remix') => Promise<void>;
    addGeneratingPrediction: (id: string) => void;
    removeGeneratingPrediction: (id: string) => void;
    setAdvancedSettings: (settings: Partial<AdvancedSettings>) => void;
    setIsGenerating: (isGenerating: boolean) => void;
    toggleImageGenerate: () => void;
    setError: (error: string | null) => void;
}

export const generationSlice: StateCreator<
    GenerationState & GenerationSlice,
    [],
    [],
    GenerationSlice
> = (set, get) => ({
    isGenerating: false,
    showImageGenerate: false,
    error: null,
    generatingPredictions: new Set<string>(),
    preprocessingStates: {},
    advancedSettings: {
        steps: 30,
        guidanceScale: 4.5,
        scheduler: 'dpmpp_2m_sde',
        seed: -1,
        outputFormat: 'png',
        outputQuality: 95,
        randomiseSeeds: true,
        negativePrompt: '',
        width: 1360,
        height: 768,
        isHorizontal: false,
        model: '',
        numInferenceSteps: 0
    },

    setAdvancedSettings: (settings) => set(state => ({
        advancedSettings: { ...state.advancedSettings, ...settings }
    })),

    setIsGenerating: (isGenerating) => set({ isGenerating }),

    toggleImageGenerate: () => set(state => ({
        showImageGenerate: !state.showImageGenerate
    })),

    setError: (error) => set({ error }),

    addGeneratingPrediction: (id) => set(state => ({
        generatingPredictions: new Set([...state.generatingPredictions, id])
    })),

    removeGeneratingPrediction: (id) => set(state => {
        const newPredictions = new Set(state.generatingPredictions);
        newPredictions.delete(id);
        return { generatingPredictions: newPredictions };
    }),

    generatePreprocessedImage: async (shapeId, processType) => {
        console.log('Starting preprocessing:', { shapeId, processType });
        const state = get();
        set(state => ({
            preprocessingStates: {
                ...state.preprocessingStates,
                [shapeId]: {
                    ...state.preprocessingStates[shapeId],
                    [processType]: true
                }
            }
        }));

        try {
            const shape = state.shapes.find(s => s.id === shapeId);
            if (!shape?.imageUrl) return;

            // Create subscription first
            const subscription = supabase.channel(`preprocessing_${shapeId}`);
            await subscription
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'preprocessed_images',
                        filter: `shape_id=eq.${shapeId}`,
                    },
                    (payload: PreprocessingPayload) => {
                        console.log('Received webhook payload:', payload);
                        if (payload.new.status === 'completed') {
                            const updates: Partial<Shape> = {};
                            switch (processType) {
                                case 'depth':
                                    updates.depthPreviewUrl = payload.new.output_url;
                                    break;
                                case 'edge':
                                    updates.edgePreviewUrl = payload.new.output_url;
                                    break;
                                case 'pose':
                                    updates.posePreviewUrl = payload.new.output_url;
                                    break;
                                case 'scribble':
                                    updates.scribblePreviewUrl = payload.new.output_url;
                                    break;
                                case 'remix':
                                    updates.remixPreviewUrl = payload.new.output_url;
                                    break;
                            }
                            state.updateShape(shapeId, updates);
                            subscription.unsubscribe();
                        }
                    }
                )
                .subscribe();

            // Then make the API call
            await fetch('/.netlify/functions/preprocess-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: shape.imageUrl,
                    processType,
                    shapeId
                })
            });
        } catch (error) {
            console.error('Error generating preprocessed image:', error);
            set({
                error: error instanceof Error ? error.message : 'Failed to preprocess image'
            });
        }
    }
});