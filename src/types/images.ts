export interface Asset {
  id: string;
  url: string;
  created_at: string;
  user_id: string;
  width?: number;
  height?: number;
  depthStrength?: number;
  edgesStrength?: number;
  poseStrength?: number;
  sketchStrength?: number;
  remixStrength?: number;
}

export interface SavedImage {
  id: string;
  user_id: string;
  prompt: string;
  aspect_ratio: string;
  created_at: string;
  prediction_id: string;
  status: "generating" | "completed" | "failed";
  updated_at: string;
  image_index: number;
  originalUrl: string;
  depthUrl: string;
  edgeUrl: string;
  poseUrl: string;
  generated_01: string;
  generated_02: string;
  generated_03: string;
  generated_04: string;
  model: string;
  output_format: 'png' | 'jpg';
  output_quality: number;
  randomise_seeds: boolean;
  error_message?: string;
  num_inference_steps: number;
  prompt_negative: string;
  width: number;
  height: number;
  num_outputs: number;
  scheduler: string;
  guidance_scale: number;
  prompt_strength: number;
  seed: number;
  refine: boolean;
  refine_steps: number;
  lora_scale: number;
  lora_weights: string;
  depth_scale: number;
  edge_scale: number;
  pose_scale: number;
  sketchMapUrl: string;
  sketch_scale: number;
  remixMapUrl: string;
  remix_scale: number;
  logs: string;
}

export interface DetailedSavedImage {
  id: string;
  generated_01: string;
  prompt: string;
  created_at: string;
  status: "generating" | "completed" | "failed";
  aspect_ratio: string;
  user_id?: string;
  prediction_id?: string;
  image_index?: number;
}

export interface SourcePlusImage {
  id: string;
  url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  description?: string;
  author?: {
    name?: string;
    username?: string;
  };
}

export interface ImageGenerationSettings {
  scheduler: string;
  seed: number;
  steps: number;
  guidanceScale: number;
  outputFormat: 'png' | 'jpg';
  outputQuality: number;
  randomiseSeeds: boolean;
  negativePrompt: string;
  outputWidth: number;
  outputHeight: number;
  numInferenceSteps: number;
  promptStrength: number;
  refine: boolean;
  refineSteps: number;
  loraScale: number;
  loraWeights: string;
  depthScale: number;
  edgeScale: number;
  poseScale: number;
  sketchScale: number;
  remixScale: number;
} 