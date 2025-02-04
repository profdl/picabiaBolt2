import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export const handler: Handler = async (event) => {
    console.log('Preprocess Webhook received:', new Date().toISOString());

    try {
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: 'No webhook payload received'
                })
            };
        }

        const payload = JSON.parse(event.body);
        const { output, status, id } = payload;

        console.log('Webhook data:', { status, hasOutput: !!output, id });

        if (status === 'succeeded' && Array.isArray(output) && output.length > 0) {
            const response = await fetch(output[0]);
            const imageBuffer = await response.arrayBuffer();
            const imageData = new Uint8Array(imageBuffer);

            const { data: prediction } = await supabase
                .from('preprocessed_images')
                .select('*')
                .eq('prediction_id', id)
                .single();

            const filename = `${prediction.shapeId}-${prediction.processType}-${Date.now()}.png`;

            await supabase
                .storage
                .from('preprocessed-images')
                .upload(filename, imageData, {
                    contentType: 'image/png',
                    cacheControl: '3600'
                });

            const { data: { publicUrl } } = supabase
                .storage
                .from('preprocessed-images')
                .getPublicUrl(filename);

            await supabase
                .from('preprocessed_images')
                .update({
                    [`${prediction.processType}Url`]: publicUrl,
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('prediction_id', id);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    data: { id, status: 'completed' }
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                data: { id, status }
            })
        };

    } catch (error) {
        console.error('Error processing webhook:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: 'Error processing webhook'
            })
        };
    }
};
