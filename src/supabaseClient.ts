
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);




export const handleGenerate = async (state: BoardState) => {
    const state = get();
    const { shapes } = state;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User must be authenticated');

    // Find the active prompts
    const imageWithPrompt = shapes.find(
        shape => (shape.type === 'image' || shape.type === 'canvas') && shape.showPrompt
    );
    const stickyWithPrompt = shapes.find(
        shape => shape.type === 'sticky' && shape.showPrompt && shape.content
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
            prediction_id: responseData.prediction.id,
            image_url: '',
            aspect_ratio: state.aspectRatio,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Create three records with different image indices
        const records = [0, 1, 2].map(index => ({
            ...insertData,
            image_index: index
        }));

        console.log('Attempting to insert records:', {
            recordCount: records.length,
            sampleRecord: records[0],
            prediction_id: responseData.prediction.id
        });

        const { data: pendingImages, error: dbError } = await supabase
            .from('generated_images')
            .insert(records)
            .select();

        console.log('Database operation result:', {
            success: !dbError,
            recordsCreated: pendingImages?.length,
            error: dbError,
            firstRecord: pendingImages?.[0]
        });

        // Validate the insert
        // Validate the insert
        if (dbError || !pendingImages || pendingImages.length !== 3) {
            console.log('Insert validation failed:', {
                hasError: !!dbError,
                recordCount: pendingImages?.length,
                expectedCount: 3
            });
            throw new Error('Failed to create all three image records');
        }

        console.log('Supabase insert result:', {
            data: pendingImages,
            count: pendingImages.length,
            error: dbError
        });
    } catch (error) {
        console.error('Error in handleGenerate:', error);
        set({
            error: error instanceof Error ? error.message : 'Failed to generate image',
            isGenerating: false
        });
    }
};