import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';

const REPLICATE_API_TOKEN = process.env.VITE_REPLICATE_API_TOKEN;
const MODEL_VERSION = "10990543610c5a77a268f426adb817753842697fa0fa5819dc4a396b632a5c15";

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

export const handler: Handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (!REPLICATE_API_TOKEN) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Image generation service is not configured' })
        };
    }

    try {
        const { workflow_json, input_file, webhook } = JSON.parse(event.body || '{}');

        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                Authorization: `Token ${REPLICATE_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                version: MODEL_VERSION,
                input: {
                    workflow_json,
                    input_file
                },
                webhook,
                webhook_events_filter: ["completed"]
            })
        });

        const prediction = await response.json();
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ predictionId: prediction.id })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to start prediction' })
        };
    }
};
