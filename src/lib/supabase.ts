
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




export async function saveGeneratedImage(imageUrls: string[], prompt: string, aspectRatio: string) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('User must be authenticated to save images')

  // Upload all images in parallel
  const uploadPromises = imageUrls.map(async (imageUrl, index) => {
    const response = await fetch(imageUrl)
    const arrayBuffer = await response.arrayBuffer()
    const imageData = new Uint8Array(arrayBuffer)
    const filename = `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}.png`

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

    return publicUrl
  })

  const publicUrls = await Promise.all(uploadPromises)

  const [width, height] = aspectRatio.split(':').map(Number)
  const aspectRatioValue = width / height

  const { data, error } = await supabase
    .from('generated_images')
    .insert({
      user_id: user.id,
      image_url: publicUrls[0],
      image_url_2: publicUrls[1] || null,
      image_url_3: publicUrls[2] || null,
      image_url_4: publicUrls[3] || null,
      prompt: prompt,
      aspect_ratio: aspectRatioValue
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export const convertToWebP = async (file: File): Promise<Blob> => {
  const img = new Image();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  await new Promise((resolve) => {
    img.onload = resolve;
    img.src = URL.createObjectURL(file);
  });

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob(blob => resolve(blob!), 'image/webp', 0.95);
  });
};

export const uploadAssetToSupabase = async (blob: Blob) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.webp`;

  const { error: uploadError } = await supabase.storage
    .from('assets')
    .upload(fileName, blob, {
      contentType: 'image/webp',
      upsert: false
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('assets')
    .getPublicUrl(fileName);

  await supabase.from('assets').insert([{
    url: publicUrl,
    user_id: user.id
  }]);

  return { publicUrl };
};

export async function savePreprocessedImage(
  shapeId: string,
  originalUrl: string,
  processType: 'depth' | 'edge' | 'pose',
  processedUrl: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  // Download image from Replicate URL
  const response = await fetch(processedUrl);
  const blob = await response.blob();

  // Upload to Supabase bucket
  const fileName = `${user.id}/${shapeId}/${processType}-${Date.now()}.png`;
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('preprocessed-images')
    .upload(fileName, blob);

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: { publicUrl } } = supabase
    .storage
    .from('preprocessed-images')
    .getPublicUrl(fileName);

  // Save record in database
  const { data, error } = await supabase
    .from('preprocessed_images')
    .upsert({
      user_id: user.id,
      shapeId,
      originalUrl,
      [`${processType}Url`]: publicUrl,
      created_at: new Date().toISOString()
    }, {
      onConflict: 'shapeId,user_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}




export const getPublicImageUrl = (imageUrl: string | undefined): string => {
  if (!imageUrl) return '';

  // If already a full URL, return as is
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }

  // If base64, return as is
  if (imageUrl.startsWith('data:image')) {
    return imageUrl;
  }

  // Get public URL from Supabase storage
  const { data: { publicUrl } } = supabase.storage
    .from('preprocessed-images')
    .getPublicUrl(imageUrl);

  return publicUrl;
};

export const handleAuthError = (error: unknown): string => {
  if (typeof error === 'string') return error;

  const errorObj = error as { message?: string };
  if (errorObj.message) return errorObj.message;

  return 'An unexpected error occurred';
};


export async function createWelcomeProjects(userId: string) {
  // Fetch all template projects
  const { data: templates, error: templatesError } = await supabase
    .from('projects')
    .select('*')
    .eq('is_template', true);

  if (templatesError) throw templatesError;

  // Create each template project for the new user
  const projectPromises = templates.map(template =>
    supabase
      .from('projects')
      .insert({
        ...template,
        id: undefined, // Let Supabase generate a new ID
        user_id: userId,
        is_template: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
  );

  const results = await Promise.all(projectPromises);
  return results;
}
