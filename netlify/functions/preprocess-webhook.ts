import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
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
        const { data: prediction, error: queryError } = await supabase
            .from('preprocessed_images')
            .select('*')
            .eq('prediction_id', id)
            .single();

        if (queryError || !prediction) {
            console.error('Failed to find prediction record:', { id, error: queryError });
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    error: 'Prediction record not found'
                })
            };
        }
        if (!id) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: 'No prediction ID provided'
                })
            };
        }

        if (status === 'succeeded' && output && output.length > 0) {
            // The model returns an array of image URLs
            const processedImageUrl = output[0];

            // Get the prediction record
            const { data: prediction, error: queryError } = await supabase
                .from('preprocessed_images')
                .select('*')
                .eq('prediction_id', id)
                .single();

            if (queryError || !prediction) {
                console.error('Failed to find prediction record:', { id, error: queryError });
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        success: false,
                        error: 'Prediction record not found'
                    })
                };
            }

            // Download and upload to Supabase storage
            const response = await fetch(processedImageUrl);
            const imageBuffer = await response.arrayBuffer();
            const imageData = new Uint8Array(imageBuffer);

            const filename = `${prediction.shapeId}-${prediction.processType}-${Date.now()}.png`;

            const { error: uploadError } = await supabase
                .storage
                .from('preprocessed-images')
                .upload(filename, imageData, {
                    contentType: 'image/png',
                    cacheControl: '3600'
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase
                .storage
                .from('preprocessed-images')
                .getPublicUrl(filename);

            // Update the database record
            const { error } = await supabase
                .from('preprocessed_images')
                .update({
                    [`${prediction.processType}Url`]: publicUrl,
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('prediction_id', id);

            console.log('Update operation details:', {
                prediction_id: id,
                success: !error,
                error: error?.message
            });

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Preprocessed image saved successfully',
                    data: { id, status: 'completed' }
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Webhook received but no update required',
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
