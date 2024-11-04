import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.requestContext.routeKey === '$connect') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Connected' })
        };
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Message received' })
    };
};