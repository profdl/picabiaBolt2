
interface GenerateImageResponse {
  imageUrl?: string;
  error?: string;
}

import controlWorkflow from './controlWorkflow.json';

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

  // Update the workflow nodes while preserving their structure
  workflow[6] = {
    ...workflow[6],
    class_type: "CLIPTextEncode",
    inputs: {
      text: workflowJson,
      clip: ["4", 1]
    },
    _meta: {
      title: "CLIP Text Encode (Positive)"
    }
  };

  workflow[12] = {
    ...workflow[12],
    class_type: "LoadImage",
    inputs: {
      image: inputImage,
      upload: "image"
    },
    _meta: {
      title: "Load Image"
    }
  };
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
    } catch {
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