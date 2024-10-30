import { handleError } from './supabase/errors';

interface GenerateImageResponse {
  imageUrl?: string;
  error?: string;
}

export async function generateImage(
  prompt: string, 
  aspectRatio: string,
  steps: number,
  negativePrompt: string,
  guidanceScale: number,
  scheduler: string,
  seed: number
): Promise<string> {
  try {
    // First, test if our functions are accessible
    const testResponse = await fetch('/.netlify/functions/test-endpoint');
    if (!testResponse.ok) {
      throw new Error('Image generation service is not available');
    }

    const response = await fetch('/.netlify/functions/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        prompt, 
        aspectRatio,
        steps,
        negativePrompt,
        guidanceScale,
        scheduler,
        seed
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
    
    if (!data.imageUrl) {
      throw new Error('No image URL in response');
    }

    return data.imageUrl;
  } catch (error) {
    console.error('Image generation error:', error);
    throw error instanceof Error ? error : new Error('Failed to generate image');
  }
}