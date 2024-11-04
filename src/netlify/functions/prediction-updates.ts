import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    };

    const predictionId = event.queryStringParameters?.predictionId;
    if (!predictionId) {
        return {
            statusCode: 400,
            body: 'Missing predictionId'
        };
    }

    return {
        statusCode: 200,
        headers,
        body: `data: ${JSON.stringify({ predictionId })}\n\n`,
        isBase64Encoded: false
    };
};
