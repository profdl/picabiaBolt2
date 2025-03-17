import { supabase } from "../lib/supabase";
import { Shape } from "../types";

export const canvasToFile = async (
  canvas: HTMLCanvasElement
): Promise<File> => {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const file = new File([blob!], "sketchpad.png", { type: "image/png" });
      resolve(file);
    }, "image/png");
  });
};

export const uploadCanvasToSupabase = async (canvas: HTMLCanvasElement) => {
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob from canvas"));
        }
      }, "image/png");
    });
    const fileName = `sketchpad-${Math.random().toString(36).substring(2)}.png`;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(fileName, blob, {
        contentType: "image/png",
        upsert: false,
      });
    console.log("Blob size:", blob.size, "Blob type:", blob.type);

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("assets").getPublicUrl(fileName);

    await supabase.from("assets").insert([
      {
        url: publicUrl,
        user_id: user.id,
      },
    ]);

    return publicUrl;
  } catch (error) {
    console.error("Error in uploadCanvasToSupabase:", error);
    throw error;
  }
};

export const mergeImageWithStrokes = async (shape: Shape): Promise<string> => {
  if (!shape.imageUrl) {
    throw new Error("No image URL provided");
  }

  // First check if there are any brush strokes by looking at the preview canvas
  const previewCanvas = document.querySelector(`canvas[data-shape-id="${shape.id}"]`) as HTMLCanvasElement;
  if (!previewCanvas) {
    console.error('Preview canvas not found');
    return shape.imageUrl;
  }

  // Get the image data to check for non-transparent pixels
  const ctx = previewCanvas.getContext('2d');
  if (!ctx) {
    console.error('Could not get canvas context');
    return shape.imageUrl;
  }

  const imageData = ctx.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
  const hasNonTransparentPixels = imageData.data.some((value, index) => {
    // Check alpha channel (every 4th value)
    return index % 4 === 3 && value > 0;
  });

  if (!hasNonTransparentPixels) {
    // If no brush strokes, return the original image URL
    return shape.imageUrl;
  }

  // If there are brush strokes, create a blob from the preview canvas
  const blob = await new Promise<Blob>((resolve, reject) => {
    previewCanvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob from canvas'));
      }
    }, 'image/png', 1.0);
  });

  // Upload to Supabase
  const fileName = `merged_${Math.random().toString(36).substring(2)}.png`;
  const arrayBuffer = await blob.arrayBuffer();
  const fileData = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from("assets")
    .upload(fileName, fileData, {
      contentType: 'image/png',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from("assets")
    .getPublicUrl(fileName);

  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  // Insert record in assets table
  const { error: dbError } = await supabase
    .from("assets")
    .insert({
      url: publicUrl,
      user_id: user.id,
      created_at: new Date().toISOString()
    });

  if (dbError) throw dbError;

  return publicUrl;
};
