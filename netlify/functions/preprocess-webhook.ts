import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler: Handler = async (event) => {
    const payload = JSON.parse(event.body);
    const { output, status, id } = payload;

    if (status === 'succeeded' && output) {
        const processedUrl = output[0];

        const { data: prediction } = await supabase
            .from('preprocessed_images')
            .select('*')
            .eq('prediction_id', id)
            .single();

        const savedData = await savePreprocessedImage(
            prediction.shapeId,
            prediction.originalUrl,
            prediction.processType,
            processedUrl
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                data: savedData,
                shapeId: prediction.shapeId
            })
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ status })
    };
};


function savePreprocessedImage(shapeId: unknown, originalUrl: unknown, processType: unknown, processedUrl: unknown) {
    throw new Error('Function not implemented.');
}

