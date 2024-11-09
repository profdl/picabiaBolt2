import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);




interface Shape {
    type: string;
    showPrompt?: boolean;
    content?: string;
    imageUrl?: string;
    isGenerating: boolean;
    error?: string | null;
}

interface BoardState {
    shapes: Shape[];
    advancedSettings: {
        outputFormat: string;
        outputQuality: string;
        randomiseSeeds: boolean;
    };
    aspectRatio: string;
    isGenerating: boolean;
}

const set = (state: Partial<BoardState>) => {
    // Implement the set function logic here
    console.log('State updated:', state);
};

// Define or import controlWorkflow here
const controlWorkflow = {
    "6": { inputs: { text: "" } },
    "12": { inputs: { image: "" } }
};

export const handleGenerate = async (state: BoardState) => {
    const { shapes } = state;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User must be authenticated');

    // Find the active prompts

    const imageWithPrompt: Shape | undefined = shapes.find(
        (shape: Shape) => (shape.type === 'image' || shape.type === 'canvas') && shape.showPrompt
    );
    const stickyWithPrompt = shapes.find(
        shape => shape.type === 'sticky' && shape.showPrompt && shape.content
    );

    if (!stickyWithPrompt?.content) {
        set({ isGenerating: false });
        return;
    }

    set({ isGenerating: true });

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
            isGenerating: false
        });
    }
};