import { Handler } from '@netlify/functions';




const SOURCEPLUS_API_KEY = process.env.SOURCEPLUS_API_KEY;

export const handler: Handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
    
    if (!SOURCEPLUS_API_KEY) {
        console.error('Source.plus API key is missing');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Configuration Error',
                details: 'API key is not configured'
            })
        };
    }

    try {
        const query = event.queryStringParameters?.query;
        console.log('Received query:', query);

        const requestBody = {
            query_string: query || "",
            collection_ids: [],
            collection_slug: "flowers-7dgsgm20",
            skip: 0,
            limit: 50,
            run_semantic_search: false,
            include_synthetic: true,
            include_non_synthetic: true,
            include_nsfw: true,
            include_flagged: true,
            include_duplicates: true,
            only_originals: false
        };
        
        console.log('Making request to Source.plus with body:', requestBody);

        const response = await fetch(
            'https://search.source.plus/v1/search/intercollections/',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SOURCEPLUS_API_KEY}`
                },
                body: JSON.stringify(requestBody)
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Source.plus API error response:", errorText);
            return {
                statusCode: response.status,
                headers,
                body: errorText
            };
        }

        const data = await response.json();
        console.log('Successful response received:', data);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                results: data.results.map((item: any) => ({
                    id: item._source.id,
                    // Use the same base URL as the thumbnail_url
                    url: item._source.thumbnail_url.replace('/thumbnails/', '/images/'),
                    thumbnail_url: item._source.thumbnail_url,
                    width: item._source.width,
                    height: item._source.height,
                    description: item._source['source_attributes.title'],
                    author: {
                        name: item._source['source_attributes.creator'],
                        username: item._source['source_attributes.orig_org']
                    }
                }))
            })
        };
    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
            body: JSON.stringify({ 
                details: error instanceof Error ? error.message : 'Unknown error',
                results: [] })
            })
        };
    }
};