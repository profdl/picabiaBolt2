import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);
const MODEL_VERSION = "fofr/any-comfyui-workflow:7371a10e10eb020b6c4875333789dfccafccb69bc08cdce3ba60eb7b5feb5e38";
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

        const getWorkflowJson = (imageUrl: string, processType: string) => {
            const baseWorkflow = require('../lib/preProcessWorkflow.json');

            // Update the image input URL
            baseWorkflow["10"].inputs.image = imageUrl;

            // Set the appropriate preprocessor based on process type
            switch (processType) {
                case 'depth':
                    baseWorkflow["33"].inputs.preprocessor = "MiDaS";
                    break;
                case 'edge':
                    baseWorkflow["33"].inputs.preprocessor = "Canny";
                    break;
                case 'pose':
                    baseWorkflow["33"].inputs.preprocessor = "OpenPose";
                    break;
            }

            return JSON.stringify(baseWorkflow);
        };

        const prediction = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                version: MODEL_VERSION,
                input: {
                    workflow_json: getWorkflowJson(imageUrl, processType),
                    input_file: imageUrl,
                    output_format: "png",
                    output_quality: 95,
                    randomise_seeds: false
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
            const { data, error: dbError } = await supabase
                .from('preprocessed_images')
                .insert({
                    user_id: payload.userId,
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
