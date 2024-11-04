import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
)

const handler: Handler = async (event) => {
    console.log('Webhook received event:', event);
    console.log('Webhook request body:', event.body);

    const payload = JSON.parse(event.body);
    console.log('Parsed webhook payload:', payload);

    const { id, output, status, metadata } = payload;
    console.log('Webhook data:', { id, output, status, metadata });

    if (status === 'succeeded') {
        console.log('Processing successful prediction, updating database...');
        const { data, error } = await supabase
            .from('generated_images')
            .update({
                image_url: output[0],
                status: 'completed',
                prediction_id: id
            })
            .match({ id: metadata.imageId })
            .select();

        if (error) {
            console.error('Database update error:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to update image status' })
            }
        }

        console.log('Database updated successfully:', data);
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
    }
}

export { handler }
