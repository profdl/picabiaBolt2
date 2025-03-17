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
  // Create a temporary canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Set canvas dimensions to match the shape
  canvas.width = shape.width;
  canvas.height = shape.height;

  // Load and draw the background image
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = shape.imageUrl || '';
  });
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // If there are brush strokes, draw them on top
  const canvasData = shape.canvasData;
  if (canvasData) {
    const strokesImg = new Image();
    strokesImg.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
      strokesImg.onload = resolve;
      strokesImg.onerror = reject;
      strokesImg.src = canvasData;
    });

    // Set composite operation to ensure strokes blend properly
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(strokesImg, 0, 0, canvas.width, canvas.height);
  }

  // Convert canvas to blob with maximum quality
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

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

  // Insert record in assets table
  await supabase.from("assets").insert([
    {
      url: publicUrl,
      user_id: user.id,
    },
  ]);

  return publicUrl;
};
