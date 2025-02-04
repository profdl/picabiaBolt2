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

        if (!id) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: 'No prediction ID provided'
                })
            };
        }

        // Update status immediately for failed or canceled states
        if (status === 'failed' || status === 'canceled') {
            const { error: statusError } = await supabase
                .from('preprocessed_images')
                .update({
                    status: status,
                    updated_at: new Date().toISOString(),
                })
                .eq('prediction_id', id);

            if (statusError) throw statusError;

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    data: { id, status }
                })
            };
        }

        if (status === 'succeeded' && Array.isArray(output) && output.length > 0) {
            try {
                // Fetch image from Replicate URL
                const response = await fetch(output[0]);
                if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
                
                const imageBuffer = await response.arrayBuffer();
                const imageData = new Uint8Array(imageBuffer);

                // Get prediction record
                const { data: prediction, error: predictionError } = await supabase
                    .from('preprocessed_images')
                    .select('*')
                    .eq('prediction_id', id)
                    .single();

                if (predictionError) throw predictionError;

                const filename = `${prediction.shapeId}-${prediction.processType}-${Date.now()}.png`;

                // Upload to Supabase storage
                const { error: uploadError } = await supabase
                    .storage
                    .from('preprocessed-images')
                    .upload(filename, imageData, {
                        contentType: 'image/png',
                        cacheControl: '3600'
                    });

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: { publicUrl } } = supabase
                    .storage
                    .from('preprocessed-images')
                    .getPublicUrl(filename);

                // Update record with URL and completed status
                const { error: updateError } = await supabase
                    .from('preprocessed_images')
                    .update({
                        [`${prediction.processType}Url`]: publicUrl,
                        status: 'completed',
                        updated_at: new Date().toISOString()
                    })
                    .eq('prediction_id', id);

                if (updateError) throw updateError;

                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: true,
                        data: { id, status: 'completed', url: publicUrl }
                    })
                };
            } catch (processingError) {
                console.error('Error processing image:', processingError);
                
                // Update record with error status
                await supabase
                    .from('preprocessed_images')
                    .update({
                        status: 'error',
                        error_message: processingError instanceof Error ? processingError.message : 'Failed to process image',
                        updated_at: new Date().toISOString()
                    })
                    .eq('prediction_id', id);

                throw processingError;
            }
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
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        try {
            // Only attempt database update if we have an ID from the original payload
            const parsedBody = event.body ? JSON.parse(event.body) : null;
            if (parsedBody?.id) {
                await supabase
                    .from('preprocessed_images')
                    .update({
                        status: 'error',
                        error_message: errorMessage,
                        updated_at: new Date().toISOString()
                    })
                    .eq('prediction_id', parsedBody.id);
            }
        } catch (dbError) {
            console.error('Failed to update error state in database:', dbError);
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: errorMessage
            })
        };
    }
};