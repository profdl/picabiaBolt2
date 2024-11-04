import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
)

const handler: Handler = async (event) => {
    console.log('Received event:', event)
    const payload = JSON.parse(event.body)
    const { id, output, status, metadata } = payload

    if (status === 'succeeded') {
        const { data, error } = await supabase
            .from('generated_images')
            .update({
                image_url: output[0],
                status: 'completed',
                prediction_id: id
            })
            .match({ id: metadata.imageId })
            .select()

        if (error) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to update image status' })
            }
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
    }
}

export { handler }