import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
)

export const handler = async (event) => {
    console.log('[webhook] Received webhook:', {
        timestamp: new Date().toISOString(),
        headers: event.headers
    });

    const payload = JSON.parse(event.body);
    console.log('[webhook] Payload:', {
        id: payload.id,
        status: payload.status,
        hasOutput: !!payload.output
    });

    // Log database operations
    console.log('[webhook] Database operation:', {
        imageId: payload.metadata?.imageId,
        operation: 'update',
        status: 'started'
    });

    // Validate required fields
    if (!payload.metadata?.imageId) {
        console.log('Missing imageId in metadata:', payload);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing imageId in metadata' })
        };
    }

    const { id, output, status, metadata } = payload;

    // Rest of your handler code...

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
