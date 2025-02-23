import { Handler } from '@netlify/functions';

const SOURCEPLUS_API_KEY = process.env.SOURCEPLUS_API_KEY;

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const imageUrl = event.queryStringParameters?.url;

    if (!imageUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image URL is required' })
      };
    }

    if (!SOURCEPLUS_API_KEY) {
      console.error('Source.plus API key is missing');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key is not configured' })
      };
    }

    // Use the thumbnail URL instead of the full image URL
    const thumbnailUrl = imageUrl.replace('/images/', '/thumbnails/');

    const response = await fetch(thumbnailUrl, {
      headers: {
        'Authorization': `Bearer ${SOURCEPLUS_API_KEY}`,
        'Accept': 'image/*',
        'User-Agent': 'Source.plus Integration'
      }
    });

    if (!response.ok) {
      console.error('Source.plus image fetch error:', {
        status: response.status,
        statusText: response.statusText
      });
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to fetch image from Source.plus',
          details: response.statusText
        })
      };
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data: `data:${contentType};base64,${base64}`
      })
    };
  } catch (error) {
    console.error('Proxy function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to proxy image',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};