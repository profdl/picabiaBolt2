import { Handler } from '@netlify/functions';




const SOURCEPLUS_API_KEY = process.env.SOURCEPLUS_API_KEY;


interface SourcePlusApiResponse {
    results: {
        _index: string;
        _id: string;
        _score: number;
        _source: {
            id: string;
            thumbnail_url: string;
            width: number;
            height: number;
            'source_attributes.title': string;
            'source_attributes.creator': string | null;
            'source_attributes.orig_org': string;
        };
    }[];
    aggs: Record<string, unknown>;
    total_hits: number;
}

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

        const data = await response.json() as SourcePlusApiResponse;
        console.log('Raw API response:', JSON.stringify(data, null, 2));
    
        const mappedResults = data.results.map((item) => {
            const fullImageUrl = item._source.thumbnail_url.replace('/thumbnails/', '/images/');
            console.log('Mapped URL:', fullImageUrl);
            
            return {
                id: item._source.id,
                url: fullImageUrl,
                thumbnail_url: item._source.thumbnail_url,
                width: item._source.width,
                height: item._source.height,
                description: item._source['source_attributes.title'],
                author: {
                    name: item._source['source_attributes.creator'],
                    username: item._source['source_attributes.orig_org']
                }
            };
        });
    
        console.log('Mapped results:', JSON.stringify(mappedResults, null, 2));
    
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ results: mappedResults })
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