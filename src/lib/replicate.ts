import { handleSupabaseError } from './supabase';

interface GenerateImageResponse {
  imageUrl?: string;
  error?: string;
}

import multiControlWorkflow from './multiControl_API.json';

export interface ReplicateWorkflow {
  version: string;
  input: {
    prompt?: string;
    negative_prompt?: string;
    width?: number;
    height?: number;
    num_outputs?: number;
    scheduler?: string;
    num_inference_steps?: number;
    guidance_scale?: number;
    [key: string]: any;
  };
}

export interface ReplicateResponse {
  id: string;
  version: string;
  urls: {
    get: string;
    cancel: string;
  };
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string[];
  error?: string;
  metrics?: {
    predict_time?: number;
  };
}

const REPLICATE_API_URL = 'https://api.replicate.com/v1';
const REPLICATE_API_TOKEN = import.meta.env.VITE_REPLICATE_API_TOKEN;

export async function createPrediction(workflow: ReplicateWorkflow): Promise<ReplicateResponse> {
  const response = await fetch(`${REPLICATE_API_URL}/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(workflow),
  });

  if (!response.ok) {
    throw new Error(`Replicate API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getPrediction(id: string): Promise<ReplicateResponse> {
  const response = await fetch(`${REPLICATE_API_URL}/predictions/${id}`, {
    headers: {
      'Authorization': `Token ${REPLICATE_API_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Replicate API error: ${response.statusText}`);
  }

  return response.json();
}

export async function cancelPrediction(id: string): Promise<void> {
  const response = await fetch(`${REPLICATE_API_URL}/predictions/${id}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${REPLICATE_API_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to cancel prediction: ${response.statusText}`);
  }
}

export async function generateImage(
  workflowJson: string,
  inputImage?: string,
  outputFormat: 'webp' | 'jpg' | 'png' = 'webp',
  outputQuality: number = 95,
  randomiseSeeds: boolean = true,
): Promise<string> {
  // Create a unique imageId for tracking
  const imageId = Math.random().toString(36).substring(2);

  // Create a deep copy of the control workflow
  const workflow = JSON.parse(JSON.stringify(controlWorkflow));

  // Update the LoadImage node with the input image
  workflow[12].inputs.image = inputImage;

  // Update the positive prompt
  workflow[6].inputs.text = workflowJson;

  // Set random seed if enabled
  if (randomiseSeeds) {
    workflow[3].inputs.seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  }

  try {
    // Add before API call
    console.log('Initiating image generation request', {
      workflowLength: workflowJson.length,
      outputFormat,
      outputQuality,
      randomiseSeeds
    });

    const response = await fetch('/.netlify/functions/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_json: JSON.stringify(workflow),
        imageUrl: inputImage,
        output_format: outputFormat,
        output_quality: outputQuality,
        randomise_seeds: randomiseSeeds,
        imageId: imageId  // Add this line
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let error;
      try {
        const errorJson = JSON.parse(errorText);
        error = errorJson.error || `Failed to generate image: ${response.status}`;
      } catch {
        error = errorText || `Failed to generate image: ${response.status}`;
      }
      throw new Error(error);
    }

    let data: GenerateImageResponse;
    try {
      data = await response.json();
    } catch (err) {
      throw new Error('Invalid response from image generation service');
    }

    // Add after API response
    console.log('Image generation response received', {
      status: response.status,
      headers: response.headers,
      hasImageUrl: !!data?.imageUrl
    });

    if (!data.imageUrl) {
      throw new Error('No image URL in response');
    }

    return data.imageUrl;
  } catch (error) {
    // Enhanced error logging
    console.error('Image generation error:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error instanceof Error ? error : new Error('Failed to generate image');
  }
}