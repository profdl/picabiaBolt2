import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

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
            console.log('Processing prediction:', { id, imageUrl: output[0] });

            const { data, error } = await supabase
                .from('generated_images')
                .update({
                    image_url: output[0],
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('replicate_id', id)

            console.log('Update operation details:', {
                replicate_id: id,
                success: !error,
                rowsAffected: data?.length,
                error: error?.message
            });

            if (error) throw error;

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Image record updated successfully',
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
