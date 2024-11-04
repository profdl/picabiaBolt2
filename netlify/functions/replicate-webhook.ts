import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
)

const handler: Handler = async (event) => {
    // Add at start of handler
    console.log('Webhook Received:', {
        timestamp: new Date().toISOString(),
        requestId: event.requestContext?.requestId,
        contentType: event.headers['content-type'],
        payloadSize: event.body?.length
    });

    // Add detailed logging for webhook payload
    console.log('Webhook Function Started', {
        timestamp: new Date().toISOString(),
        headers: event.headers,
        rawBody: event.body
    });

    console.log('Webhook received event:', event);
    console.log('Webhook request body:', event.body);

    const payload = JSON.parse(event.body);
    console.log('Parsed webhook payload:', payload);

    const { id, output, status, metadata } = payload;
    console.log('Webhook data:', { id, output, status, metadata });

    // Add after successful DB update
    console.log('Webhook Processing Complete:', {
        predictionId: id,
        imageId: metadata.imageId,
        outputUrl: output[0],
        processingTime: Date.now() - new Date(payload.created_at).getTime()
    });

    if (status === 'succeeded') {
        console.log('Processing successful prediction, updating database...');

        // Add before database update
        console.log('Attempting database update', {
            imageId: metadata.imageId,
            predictionId: id,
            status: status,
            output: output
        });

        const { data, error } = await supabase
            .from('generated_images')
            .update({
                image_url: output[0],
                status: 'completed',
                prediction_id: id
            })
            .match({ id: metadata.imageId })
            .select();

        // Add after database update
        console.log('Database update completed', {
            success: !error,
            data: data,
            error: error
        });

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
