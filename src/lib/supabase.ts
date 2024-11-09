
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const handleSupabaseError = (error: unknown): string => {
  if (!navigator.onLine) {
    return 'No internet connection. Please check your network.';
  }

  if (typeof error === 'object' && error !== null) {
    const errorObj = error as { message?: string; code?: string };

    if (errorObj.message?.includes('Failed to fetch') || errorObj.message?.includes('NetworkError')) {
      return 'Unable to connect to the server. Please check your connection and try again.';
    }

    if (errorObj.code === '23505') {
      return 'A record with this information already exists.';
    }

    if (errorObj.code === '42501') {
      return 'You don\'t have permission to perform this action.';
    }

    if (errorObj.code === 'PGRST116') {
      return 'Resource not found. The project may have been deleted or you may not have permission to access it.';
    }

    if (errorObj.message?.includes('JWT')) {
      return 'Your session has expired. Please log in again.';
    }

    if (errorObj.message) {
      return errorObj.message;
    }
  }

  return 'An unexpected error occurred. Please try again.';
};
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        await new Promise(resolve =>
          setTimeout(resolve, initialDelay * Math.pow(2, attempt))
        );
        continue;
      }
    }
  }

  throw lastError || new Error('Operation failed after multiple retries');
};




export async function saveGeneratedImage(imageUrl: string, prompt: string, aspectRatio: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('User must be authenticated to save images')

  // Fetch image data as an array buffer
  const response = await fetch(imageUrl)
  const arrayBuffer = await response.arrayBuffer()
  const imageData = new Uint8Array(arrayBuffer)

  const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`

  // Upload binary image data
  const { error: uploadError } = await supabase
    .storage
    .from('generated-images')
    .upload(filename, imageData, {
      contentType: 'image/png',
      cacheControl: '3600'
    })

  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase
    .storage
    .from('generated-images')
    .getPublicUrl(filename)

  const [width, height] = aspectRatio.split(':').map(Number)
  const aspectRatioValue = width / height

  const { data, error } = await supabase
    .from('generated_images')
    .insert({
      user_id: user.id,
      image_url: publicUrl,
      prompt: prompt,
      aspect_ratio: aspectRatioValue
    })
    .select()
    .single()

  if (error) throw error
  return data
}