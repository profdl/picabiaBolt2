import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { error } from 'console';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler: Handler = async (event) => {
    console.log('Webhook received:', new Date().toISOString());

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

        if (status === 'succeeded' && Array.isArray(output) && output.length > 0) {
            // First upload all images to Supabase storage
            const uploadPromises = output.map(async (imageUrl, index) => {
                // Fetch image from Replicate URL
                const response = await fetch(imageUrl);
                const imageBuffer = await response.arrayBuffer();
                const imageData = new Uint8Array(imageBuffer);

                // Generate unique filename
                const filename = `${id}-${index}-${Date.now()}.png`;

                // Upload to Supabase bucket
                const { data: uploadData, error: uploadError } = await supabase
                    .storage
                    .from('generated-images')
                    .upload(filename, imageData, {
                        contentType: 'image/png',
                        cacheControl: '3600'
                    });

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: { publicUrl } } = supabase
                    .storage
                    .from('generated-images')
                    .getPublicUrl(filename);

                return publicUrl;
            });

            const publicUrls = await Promise.all(uploadPromises);

            const { data: updateData, error } = await supabase
                .from('generated_images')
                .update({
                    generated_01: publicUrls[0],
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('prediction_id', id);

            console.log('Update operation details:', {
                prediction_id: id,
                success: !error,
                rowsAffected: updateData?.length,
                error: error?.message
            });

            if (error) throw error;
        }                  return {
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