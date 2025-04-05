import { createClient } from "@supabase/supabase-js";
import { RealtimeChannel } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
}

export const createDatabaseRecord = async (
  userId: string,
  prompt: string,
  aspectRatio: string,
  predictionId: string
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
  }) => void
): RealtimeChannel => {
  return supabase
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
          };
        };
        onUpdate(typedPayload.new);
      }
    )
    .subscribe();
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