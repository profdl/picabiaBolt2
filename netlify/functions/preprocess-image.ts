import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

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
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

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
                    open_pose: processType === 'pose'
                },
                webhook: process.env.WEBHOOK_URL,
                webhook_events_filter: ["completed"]
            })
        }).then(r => r.json());

        // Create pending record in Supabase
        await supabase
            .from('preprocessed_images')
            .insert({
                prediction_id: prediction.id,
                shapeId,
                user_id: user.id,
                originalUrl: imageUrl,
                processType,
                status: 'processing'
            });

        return {
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
