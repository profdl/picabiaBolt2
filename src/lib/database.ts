import { supabase } from './supabase/client';

interface DatabaseRecord {
  id: string;
  user_id: string;
  prompt: string;
  aspect_ratio: string;
  created_at: string;
  prediction_id: string;
  status: string;
  updated_at: string;
  generated_01: string;
  generated_02: string;
  generated_03: string;
  generated_04: string;
  model: string;
  num_inference_steps: number;
  guidance_scale: number;
  scheduler: string;
  seed: number;
  width: number;
  height: number;
  num_outputs: number;
  output_format: string;
  output_quality: number;
  prompt_negative: string;
  prompt_strength: number;
  depth_scale: number;
  edge_scale: number;
  pose_scale: number;
  sketch_scale: number;
  remix_scale: number;
  lora_scale: number;
  lora_weights: string;
  refine: boolean;
  refine_steps: number;
}

interface GenerationSubscription {
  unsubscribe: () => void;
}

export const createDatabaseRecord = async (
  userId: string,
  prompt: string,
  aspectRatio: string,
  predictionId: string,
  generationParams: {
    model?: string;
    num_inference_steps?: number;
    guidance_scale?: number;
    scheduler?: string;
    seed?: number;
    width?: number;
    height?: number;
    num_outputs?: number;
    output_format?: string;
    output_quality?: number;
    prompt_negative?: string;
    prompt_strength?: number;
    depth_scale?: number;
    edge_scale?: number;
    pose_scale?: number;
    sketch_scale?: number;
    remix_scale?: number;
    lora_scale?: number;
    lora_weights?: string;
    refine?: boolean;
    refine_steps?: number;
  } = {}
): Promise<DatabaseRecord> => {
  const insertData = {
    id: crypto.randomUUID(),
    user_id: userId,
    prompt,
    aspect_ratio: aspectRatio,
    created_at: new Date().toISOString(),
    prediction_id: predictionId,
    status: "generating",
    updated_at: new Date().toISOString(),
    generated_01: "",
    generated_02: "",
    generated_03: "",
    generated_04: "",
    
    // Add all generation parameters
    model: generationParams.model || "juggernautXL_v9",
    num_inference_steps: generationParams.num_inference_steps || 45,
    guidance_scale: generationParams.guidance_scale || 7.5,
    scheduler: generationParams.scheduler || "dpmpp_2m_sde",
    seed: generationParams.seed || Math.floor(Math.random() * 1000000),
    width: generationParams.width || 1024,
    height: generationParams.height || 1024,
    num_outputs: generationParams.num_outputs || 1,
    output_format: generationParams.output_format || "png",
    output_quality: generationParams.output_quality || 100,
    prompt_negative: generationParams.prompt_negative || "",
    prompt_strength: generationParams.prompt_strength || 1.0,
    depth_scale: generationParams.depth_scale || 0,
    edge_scale: generationParams.edge_scale || 0,
    pose_scale: generationParams.pose_scale || 0,
    sketch_scale: generationParams.sketch_scale || 0,
    remix_scale: generationParams.remix_scale || 0,
    lora_scale: generationParams.lora_scale || 0,
    lora_weights: generationParams.lora_weights || "",
    refine: generationParams.refine || false,
    refine_steps: generationParams.refine_steps || 0,
  };

  const { data, error } = await supabase
    .from("generated_images")
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const setupGenerationSubscription = (
  predictionId: string,
  onUpdate: (payload: {
    status: string;
    generated_01: string;
    prediction_id: string;
    updated_at: string;
    error_message?: string;
    logs?: string[];
  }) => void
): GenerationSubscription => {
  // Set up polling interval
  const pollInterval = setInterval(async () => {
    try {
      const { data, error } = await supabase
        .from('generated_images')
        .select('*')
        .eq('prediction_id', predictionId)
        .single();

      if (error) {
        console.error('Polling error:', error);
        return;
      }

      if (data) {
        onUpdate(data);
        // Only clear interval if generation is complete or failed
        if (data.status === 'completed' || data.status === 'error' || data.status === 'failed') {
          clearInterval(pollInterval);
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 5000); // Poll every 5 seconds

  // Set up realtime subscription
  const channel = supabase
    .channel(`generated_images_${predictionId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "generated_images",
        filter: `prediction_id=eq.${predictionId}`
      },
      (payload: unknown) => {
        const typedPayload = payload as {
          new: {
            status: string;
            generated_01: string;
            prediction_id: string;
            updated_at: string;
            error_message?: string;
            logs?: string[];
          };
        };
        onUpdate(typedPayload.new);
        // Clear polling interval when we get a realtime update
        clearInterval(pollInterval);
      }
    )
    .subscribe();

  // Return a cleanup function
  return {
    unsubscribe: () => {
      clearInterval(pollInterval);
      channel.unsubscribe();
    }
  };
};

export const uploadImageToStorage = async (
  fileName: string,
  fileData: Uint8Array,
  bucket: string = "assets"
): Promise<string> => {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, fileData, {
      contentType: 'image/png',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrl;
};

export const uploadPreprocessedImage = async (
  imageData: Uint8Array,
  processType: string,
  shapeId: string
): Promise<string> => {
  const fileName = `${shapeId}-${processType}-${Date.now()}.png`;
  return uploadImageToStorage(fileName, imageData, "preprocessed-images");
}; 