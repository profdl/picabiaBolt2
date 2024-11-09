import { StateCreator } from 'zustand'
import { supabase } from '../../lib/supabase'
import workflowJson from '../../lib/workflow.json'
import controlWorkflow from '../../lib/controlWorkflow.json'

interface ImageGenerationSlice {
    showGenerateSettings: boolean
    showUnsplash: boolean
    showGallery: boolean
    isGenerating: boolean
    aspectRatio: string
    error: string | null
    advancedSettings: {
        negativePrompt: string
        numInferenceSteps: number
        guidanceScale: number
        scheduler: string
        seed: number
        steps: number
        workflowJson: string
        outputFormat: string
        outputQuality: number
        randomiseSeeds: boolean
    }

    toggleGenerateSettings: () => void
    toggleUnsplash: () => void
    toggleGallery: () => void
    setIsGenerating: (isGenerating: boolean) => void
    setAspectRatio: (ratio: string) => void
    setAdvancedSettings: (settings: Partial<ImageGenerationSlice['advancedSettings']>) => void
    setError: (error: string | null) => void
    handleGenerate: () => Promise<void>
}

export const createImageGenerationSlice: StateCreator<ImageGenerationSlice> = (set, get) => ({
    showGenerateSettings: false,
    showUnsplash: false,
    showGallery: false,
    isGenerating: false,
    aspectRatio: '1:1',
    error: null,
    advancedSettings: {
        negativePrompt: '',
        numInferenceSteps: 50,
        guidanceScale: 7.5,
        scheduler: 'default',
        seed: 0,
        steps: 50,
        workflowJson: JSON.stringify(workflowJson),
        outputFormat: 'webp',
        outputQuality: 95,
        randomiseSeeds: true,
    },

    toggleGenerateSettings: () => set(state => ({ showGenerateSettings: !state.showGenerateSettings })),
    toggleUnsplash: () => set(state => ({ showUnsplash: !state.showUnsplash })),
    toggleGallery: () => set(state => ({ showGallery: !state.showGallery })),
    setIsGenerating: (isGenerating) => set({ isGenerating }),
    setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
    setAdvancedSettings: (settings) => set(state => ({
        advancedSettings: { ...state.advancedSettings, ...settings }
    })),
    setError: (error) => set({ error }),
    handleGenerate: async () => {
        const state = get();
        const { shapes } = state as unknown as { shapes: Shape[] };

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User must be authenticated');

        // Find the active prompts
        interface Shape {
            type: string;
            showPrompt: boolean;
            content?: string;
            imageUrl?: string;
        }

        const imageWithPrompt: Shape | undefined = shapes.find(
            (shape: Shape) => (shape.type === 'image' || shape.type === 'canvas') && shape.showPrompt
        );

        const stickyWithPrompt: Shape | undefined = shapes.find(
            (shape: Shape) => shape.type === 'sticky' && shape.showPrompt && shape.content
        );

        if (!stickyWithPrompt?.content) {
            set({ error: 'No prompt selected. Please select a sticky note with a prompt.' });
            return;
        }

        set({ isGenerating: true, error: null });

        try {
            // Clone the control workflow
            const workflow = JSON.parse(JSON.stringify(controlWorkflow));

            // Update the positive prompt in the workflow
            workflow["6"].inputs.text = stickyWithPrompt.content;

            // If there's an image prompt, update its URL
            if (imageWithPrompt?.imageUrl) {
                workflow["12"].inputs.image = imageWithPrompt.imageUrl;
            }

            const requestPayload = {
                workflow_json: workflow,
                imageUrl: imageWithPrompt?.imageUrl || null,
                outputFormat: state.advancedSettings.outputFormat,
                outputQuality: state.advancedSettings.outputQuality,
                randomiseSeeds: state.advancedSettings.randomiseSeeds
            };

            const response = await fetch('/.netlify/functions/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestPayload)
            });
            const responseData = await response.json();
            console.log('Response from generate-image:', responseData);

            // Extract ID from the nested prediction object
            const prediction_id = responseData.prediction.id;
            console.log('Extracted prediction_id:', prediction_id);

            const insertData = {
                user_id: user.id,
                prompt: stickyWithPrompt.content,
                status: 'pending',
                prediction_id: responseData.prediction.id,  // Use the correct field name from Replicate response
                image_url: '',
                aspect_ratio: state.aspectRatio,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };


            console.log('Data being inserted into Supabase:', insertData);

            const { data: pendingImage, error: dbError } = await supabase
                .from('generated_images')
                .insert(insertData)
                .select()
                .single();

            console.log('Supabase insert result:', { data: pendingImage, error: dbError });
        } catch (error) {
            console.error('Error generating image:', error);
            set({ error: error instanceof Error ? error.message : 'Failed to generate image' });
        } finally {
            set({ isGenerating: false });
        }
    }
})
