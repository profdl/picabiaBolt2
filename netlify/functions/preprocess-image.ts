import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import baseWorkflow from '../../src/lib/preProcessWorkflow.json';

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

const MODEL_VERSION = "fofr/any-comfyui-workflow:7371a10e10eb020b6c4875333789dfccafccb69bc08cdce3ba60eb7b5feb5e38";
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

export const handler: Handler = async (event) => {
    console.log('Preprocess Image Function Details:', {
        timestamp: new Date().toISOString(),
        requestId: event?.requestContext?.requestId || event?.headers['x-request-id'],
        webhook: process.env.WEBHOOK_URL,
        modelVersion: MODEL_VERSION,
        // Add payload logging
        payload: event.body ? JSON.parse(event.body) : null
    });

    if (!REPLICATE_API_TOKEN) {
        console.error('Missing REPLICATE_API_TOKEN');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Replicate API token not configured" })
        };
    }

    try {
        const payload = JSON.parse(event.body || '{}');
        const { imageUrl, processType, shapeId } = payload;

        // Add validation logging
        console.log('Validated payload:', { imageUrl, processType, shapeId });

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
                webhook: process.env.WEBHOOK_URL,
                webhook_events_filter: ["completed"]
            })
        });

        const prediction = await replicateResponse.json();

        const { data: record, error: dbError } = await supabase
            .from('preprocessed_images')
            .insert({
                shapeId,
                originalUrl: imageUrl,
                processType,
                status: 'processing',
                created_at: new Date().toISOString(),
                prediction_id: prediction.id
            })
            .select()
            .single();
        if (dbError) {
            console.error('Supabase insert error:', dbError);
            throw dbError;
        }

        // Log successful database insertion
        console.log('Created preprocessed_images record:', record);

        baseWorkflow["10"].inputs.image = imageUrl;
        baseWorkflow["33"].inputs.preprocessor = processType === 'depth' ? 'MiDaS' :
            processType === 'edge' ? 'Canny' :
                processType === 'pose' ? 'OpenPose' : 'DWPreprocessor';


        if (!replicateResponse.ok) {
            const errorData = await replicateResponse.json();
            throw new Error(errorData.detail || "Failed to start preprocessing");
        }




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
