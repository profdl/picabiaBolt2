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
            // Get all pending records with this prediction_id
            const { data: records } = await supabase
                .from('generated_images')
                .select('*')
                .eq('prediction_id', id)
                .eq('status', 'pending');

            // Update each record with a corresponding image
            const updates = records.map((record, index) => ({
                ...record,
                image_url: output[index],
                status: 'completed',
                updated_at: new Date().toISOString()
            }));

            const { data, error } = await supabase
                .from('generated_images')
                .upsert(updates);

            if (error) throw error;

            console.log('Update operation details:', {
                prediction_id: id,
                success: !error,
                rowsAffected: data?.length,
                error: error?.message
            });

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Image records updated successfully',
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
