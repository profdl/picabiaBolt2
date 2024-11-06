import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
// Rest of the file remains the same

const MODEL_VERSION = "10990543610c5a77a268f426adb817753842697fa0fa5819dc4a396b632a5c15";
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || process.env.VITE_REPLICATE_API_TOKEN;

export const handler: Handler = async (event) => {
  console.log('Generate Image Function Details:', {
    timestamp: new Date().toISOString(),
    requestId: event.requestContext?.requestId,
    webhookUrl: process.env.WEBHOOK_URL,
    modelVersion: MODEL_VERSION
  });

  console.log('Generate Image TypeScript Function Started', {
    timestamp: new Date().toISOString(),
    httpMethod: event.httpMethod,
    headers: event.headers
  });
  console.log('Received event:', event);

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    console.log('Sending request to Replicate API', {
      modelVersion: MODEL_VERSION,
      webhookUrl: process.env.WEBHOOK_URL,
      payload: payload
    });
    const replicateResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: MODEL_VERSION,
        input: {
          workflow_json: JSON.stringify(payload.workflow_json),  // Convert object to string
          input_file: payload.imageUrl,
          output_format: payload.outputFormat,
          output_quality: payload.outputQuality,
          randomise_seeds: payload.randomiseSeeds
        },
        webhook: process.env.WEBHOOK_URL,
        webhook_events_filter: ["completed"]
      })
    });
    if (!replicateResponse.ok) {
      const errorData = await replicateResponse.json();
      throw new Error(errorData.detail || "Failed to start image generation");
    }

    const prediction = await replicateResponse.json();
    console.log('Replicate API Response:', {
      status: replicateResponse.status,
      prediction: prediction
    });
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ replicate_id: prediction.id })  // Send as replicate_id
    };

  } catch (error) {
    console.error("Error generating image:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to generate image"
      })
    };
  }
};