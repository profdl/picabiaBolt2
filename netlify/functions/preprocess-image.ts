import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const MODEL_VERSION = "fofr/any-comfyui-workflow:7371a10e10eb020b6c4875333789dfccafccb69bc08cdce3ba60eb7b5feb5e38";
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

export const handler: Handler = async (event) => {
    console.log('Preprocess Image Function Details:', {
        timestamp: new Date().toISOString(),
        requestId: event.requestContext?.requestId,
        webhookUrl: process.env.WEBHOOK_URL,
        modelVersion: MODEL_VERSION
    });

    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json"
    };

    try {
        const payload = JSON.parse(event.body || '{}');
        const { imageUrl, processType, shapeId } = payload;
        const baseWorkflow = require('../lib/preProcessWorkflow.json');

        baseWorkflow["10"].inputs.image = imageUrl;
        baseWorkflow["33"].inputs.preprocessor = processType === 'depth' ? 'MiDaS' :
            processType === 'edge' ? 'Canny' :
                processType === 'pose' ? 'OpenPose' : 'DWPreprocessor';

        const replicateResponse = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                version: MODEL_VERSION,
                input: {
                    workflow_json: JSON.stringify(baseWorkflow),
                    input_file: imageUrl,
                    output_format: "png",
                    output_quality: 95,
                    randomise_seeds: false
                },
                webhook: `${process.env.URL}/.netlify/functions/preprocess-webhook`,
                webhook_events_filter: ["completed"]
            })
        });

        if (!replicateResponse.ok) {
            const errorData = await replicateResponse.json();
            throw new Error(errorData.detail || "Failed to start preprocessing");
        }

        const prediction = await replicateResponse.json();

        await supabase
            .from('preprocessed_images')
            .insert({
                prediction_id: prediction.id,
                shapeId,
                originalUrl: imageUrl,
                processType,
                status: 'processing',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
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
