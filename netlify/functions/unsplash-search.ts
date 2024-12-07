import { Handler } from '@netlify/functions';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

export const handler: Handler = async (event) => {
    console.log('Unsplash search triggered:', event.queryStringParameters);

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    try {
        const query = event.queryStringParameters?.query;

        if (!query) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ results: [] })
            };
        }

        const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=30`,
            {
                headers: {
                    'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
                }
            }
        );

        const data = await response.json();
        console.log('Unsplash API response:', data);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
        };
    } catch (error) {
        console.error('Unsplash API error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ results: [] })
        };
    }
};