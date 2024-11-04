import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';

const REPLICATE_API_TOKEN = process.env.VITE_REPLICATE_API_TOKEN;
// Update the model version to the ComfyUI model
const MODEL_VERSION = "10990543610c5a77a268f426adb817753842697fa0fa5819dc4a396b632a5c15";

export const handler: Handler = async (event) => {

  'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
          'Connection': 'keep-alive',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  if (!REPLICATE_API_TOKEN) {
    console.error('Missing Replicate API token');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Image generation service is not configured' })
    };
  }

  try {
    const {
      workflow_json,
      input_file,
      output_format = 'webp',
      output_quality = 95,
      randomise_seeds = true,
    } = JSON.parse(event.body || '{}');

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: MODEL_VERSION,
        input: {
          workflow_json,
          input_file,
          output_format,
          output_quality,
          randomise_seeds,
        },
        webhook: "/.netlify/functions/webhook-handler",
        webhook_events_filter: ["completed"]
      })
    });

    const prediction = await response.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ predictionId: prediction.id })
    };
  } catch (error) {
    console.error('Error generating image:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate image'
      })
    };
  }
};