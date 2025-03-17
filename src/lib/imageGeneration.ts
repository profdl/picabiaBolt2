import { ComfyUIWorkflow } from './comfyui';
import { ReplicateWorkflow, createPrediction, getPrediction } from './replicate';
import { queuePrompt, waitForWebSocketMessage } from './comfyui';

export type ImageGenerationProvider = 'comfyui' | 'replicate';

interface ImageGenerationOptions {
  provider: ImageGenerationProvider;
  workflow: ComfyUIWorkflow | ReplicateWorkflow;
  prompt?: string;
  negativePrompt?: string;
  controlImages?: {
    type: 'depth' | 'edge' | 'pose' | 'sketch' | 'remix';
    url: string;
    strength: number;
  }[];
}

interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  metadata?: Record<string, any>;
}

class ImageGenerationService {
  private provider: ImageGenerationProvider;
  private maxRetries = 3;
  private retryDelay = 2000; // 2 seconds

  constructor(defaultProvider: ImageGenerationProvider = 'comfyui') {
    this.provider = defaultProvider;
  }

  setProvider(provider: ImageGenerationProvider) {
    this.provider = provider;
  }

  async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    try {
      const activeProvider = options.provider || this.provider;
      console.log(`Generating image with provider: ${activeProvider}`);

      switch (activeProvider) {
        case 'comfyui':
          return await this.generateWithComfyUI(options);
        case 'replicate':
          return await this.generateWithReplicate(options);
        default:
          throw new Error(`Unsupported provider: ${activeProvider}`);
      }
    } catch (error) {
      console.error('Image generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async generateWithComfyUI(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    try {
      const { workflow } = options;
      if (!isComfyUIWorkflow(workflow)) {
        throw new Error('Invalid workflow format for ComfyUI');
      }

      console.log('Queueing ComfyUI workflow');
      const response = await queuePrompt(workflow);
      
      if (!response.prompt_id) {
        throw new Error('Failed to queue workflow: No prompt ID received');
      }

      console.log('Waiting for ComfyUI generation');
      const imageData = await waitForWebSocketMessage(response.prompt_id);

      return {
        success: true,
        imageUrl: imageData,
        metadata: {
          provider: 'comfyui',
          promptId: response.prompt_id
        }
      };
    } catch (error) {
      throw new Error(`ComfyUI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateWithReplicate(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    try {
      const { workflow } = options;
      if (!isReplicateWorkflow(workflow)) {
        throw new Error('Invalid workflow format for Replicate');
      }

      console.log('Creating Replicate prediction');
      const prediction = await createPrediction(workflow);
      
      // Poll for completion
      let attempts = 0;
      while (attempts < this.maxRetries) {
        const status = await getPrediction(prediction.id);
        
        if (status.status === 'succeeded' && status.output?.[0]) {
          return {
            success: true,
            imageUrl: status.output[0],
            metadata: {
              provider: 'replicate',
              predictionId: prediction.id,
              metrics: status.metrics
            }
          };
        }
        
        if (status.status === 'failed') {
          throw new Error(status.error || 'Generation failed');
        }

        if (status.status === 'canceled') {
          throw new Error('Generation was canceled');
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        attempts++;
      }

      throw new Error('Generation timed out');
    } catch (error) {
      throw new Error(`Replicate generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Type guards
function isComfyUIWorkflow(workflow: any): workflow is ComfyUIWorkflow {
  return typeof workflow === 'object' && 
         workflow !== null &&
         Object.values(workflow).every(node => 
           typeof node === 'object' &&
           node !== null &&
           'class_type' in node &&
           'inputs' in node
         );
}

function isReplicateWorkflow(workflow: any): workflow is ReplicateWorkflow {
  return typeof workflow === 'object' &&
         workflow !== null &&
         'version' in workflow &&
         'input' in workflow &&
         typeof workflow.input === 'object';
}

// Create a singleton instance
export const imageGenerationService = new ImageGenerationService();

// Example usage in your components:
/*
import { imageGenerationService } from './lib/imageGeneration';

// In your component:
async function handleGenerate() {
  const result = await imageGenerationService.generateImage({
    provider: 'comfyui', // or 'replicate'
    workflow: myWorkflow,
    prompt: 'a beautiful landscape',
    controlImages: [{
      type: 'depth',
      url: 'depth_map.png',
      strength: 0.7
    }]
  });

  if (result.success) {
    // Handle successful generation
    console.log('Generated image:', result.imageUrl);
  } else {
    // Handle error
    console.error('Generation failed:', result.error);
  }
}
*/ 