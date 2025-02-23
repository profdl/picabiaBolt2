import { Handler } from '@netlify/functions';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

// Add basic rate limiting
const RATE_LIMIT_WINDOW = 1000; // 1 second
let lastRequestTime = 0;

export const handler: Handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
    const now = Date.now();
    if (now - lastRequestTime < RATE_LIMIT_WINDOW) {
        return {
            statusCode: 429,
            headers,
            body: JSON.stringify({ error: 'Too many requests' })
        };
    }
    lastRequestTime = now;




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