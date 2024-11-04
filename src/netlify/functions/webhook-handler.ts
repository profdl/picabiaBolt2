import { Handler } from '@netlify/functions';
import crypto from 'crypto';

const WEBHOOK_SECRET = 'whsec_cecxFUhVWR6B3R+wPj3gCfCnERFcdRtb';

function verifySignature(payload: string, signature: string): boolean {
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(`sha256=${digest}`), Buffer.from(signature));
}

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405 };
    }

    const signature = event.headers['replicate-webhook-signature'];

    if (!signature || !verifySignature(event.body || '', signature)) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Invalid signature' }) };
    }

    const prediction = JSON.parse(event.body || '{}');

    if (prediction.id && (prediction.status === 'succeeded' || prediction.status === 'failed')) {
        await fetch('/.netlify/functions/websocket-handler', {
            method: 'POST',
            body: JSON.stringify({
                type: 'prediction-update',
                predictionId: prediction.id,
                status: prediction.status,
                output: prediction.output,
                error: prediction.error
            })
        });
    }

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ received: true })
    };
};