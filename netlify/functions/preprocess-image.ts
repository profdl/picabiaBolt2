import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);
const MODEL_VERSION = "f6584ef76cf07a2014ffe1e9bdb1a5cfa714f031883ab43f8d4b05506625988e";
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || process.env.VITE_REPLICATE_API_TOKEN;

export const handler: Handler = async (event) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json"
    };

    try {
        const payload = JSON.parse(event.body || '{}');
        const { imageUrl, processType, shapeId } = payload;

        const prediction = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                version: MODEL_VERSION,
                input: {
                    image: imageUrl,
                    canny: processType === 'edge',
                    midas: processType === 'depth',
                    open_pose: processType === 'pose',
                    hed: false,
                    sam: false,
                    mlsd: false,
                    pidi: false,
                    leres: false,
                    content: false,
                    lineart: false,
                    normal_bae: false,
                    face_detector: false,
                    lineart_anime: false
                },
                webhook: `${process.env.URL}/.netlify/functions/preprocess-webhook`,
                webhook_events_filter: ["completed"]
            })
        }).then(r => r.json());

        try {
            console.log('Inserting record with data:', {
                prediction_id: prediction.id,
                shapeId,
                originalUrl: imageUrl,
                processType,
                status: 'processing'
            });

            const { error: dbError } = await supabase
                .from('preprocessed_images')
                .insert({
                    prediction_id: prediction.id,
                    shapeId,
                    originalUrl: imageUrl,
                    processType,
                    status: 'processing',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    [`${processType}Url`]: null
                });

            if (dbError) {
                console.log('Supabase insert error:', {
                    message: dbError.message,
                    details: dbError.details,
                    hint: dbError.hint
                });
            }
        } catch (error) {
            console.log('Function error:', error);
        } return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ prediction })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error instanceof Error ? error.message : "Failed to preprocess image"
            })
        };
    }

};
