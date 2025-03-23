import { Shape } from "../types";
import { supabase } from "../lib/supabase";

export async function mergeImages(images: Shape[]): Promise<Shape> {
  try {
    // Find the absolute bounds of all images
    const minX = Math.min(...images.map(img => img.position.x));
    const minY = Math.min(...images.map(img => img.position.y));
    const maxX = Math.max(...images.map(img => img.position.x + img.width));
    const maxY = Math.max(...images.map(img => img.position.y + img.height));

    // Calculate raw dimensions that we want to preserve
    const rawWidth = maxX - minX;
    const rawHeight = maxY - minY;

    // Create canvas with raw dimensions
    const canvas = document.createElement('canvas');
    canvas.width = rawWidth;
    canvas.height = rawHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Process each image
    for (const shape of images) {
      // Get all canvas layers
      const backgroundCanvas = document.querySelector(`canvas[data-shape-id="${shape.id}"][data-layer="background"]`) as HTMLCanvasElement;
      const permanentStrokesCanvas = document.querySelector(`canvas[data-shape-id="${shape.id}"][data-layer="permanent"]`) as HTMLCanvasElement;
      const maskCanvas = document.querySelector(`canvas[data-shape-id="${shape.id}"][data-layer="mask"]`) as HTMLCanvasElement;

      if (!backgroundCanvas || !permanentStrokesCanvas || !maskCanvas) {
        console.error('Required canvas layers not found for shape:', shape.id);
        continue;
      }

      // Calculate the relative position in the final composition
      const relativeX = shape.position.x - minX;
      const relativeY = shape.position.y - minY;

      // Create a temporary canvas for this shape's composition
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = shape.width;
      tempCanvas.height = shape.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) continue;

      // Calculate scaling factors between internal canvas (512px width) and display dimensions
      const scaleX = shape.width / backgroundCanvas.width;
      const scaleY = shape.height / backgroundCanvas.height;

      // Draw each layer, scaling from internal canvas size to display size
      // 1. Draw background
      tempCtx.drawImage(
        backgroundCanvas,
        0, 0, backgroundCanvas.width, backgroundCanvas.height,
        0, 0, backgroundCanvas.width * scaleX, backgroundCanvas.height * scaleY
      );

      // 2. Draw permanent strokes
      tempCtx.drawImage(
        permanentStrokesCanvas,
        0, 0, permanentStrokesCanvas.width, permanentStrokesCanvas.height,
        0, 0, permanentStrokesCanvas.width * scaleX, permanentStrokesCanvas.height * scaleY
      );

      // 3. Apply mask
      tempCtx.globalCompositeOperation = 'destination-in';
      tempCtx.drawImage(
        maskCanvas,
        0, 0, maskCanvas.width, maskCanvas.height,
        0, 0, maskCanvas.width * scaleX, maskCanvas.height * scaleY
      );
      tempCtx.globalCompositeOperation = 'source-over';

      // Draw the composited result onto the main canvas at original position
      ctx.drawImage(
        tempCanvas,
        0, 0, shape.width, shape.height,
        relativeX, relativeY, shape.width, shape.height
      );
    }

    // Convert the merged image to a blob and upload
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png',
        1.0
      );
    });

    // Upload merged image to Supabase
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

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

    const {
      data: { publicUrl },
    } = supabase.storage.from("assets").getPublicUrl(fileName);

    // Create new shape with raw dimensions
    const newShape: Shape = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'image',
      position: {
        x: minX,
        y: minY,
      },
      width: rawWidth,
      height: rawHeight,
      rotation: 0,
      imageUrl: publicUrl,
      isUploading: false,
      model: '',
      useSettings: false,
      isEditing: false,
      color: '#ffffff',
      depthStrength: 0.75,
      edgesStrength: 0.75,
      contentStrength: 0.75,
      poseStrength: 0.75,
      sketchStrength: 0.75,
      mergedFrom: images.map(img => img.id),
      isMerged: true
    };

    return newShape;
  } catch (error) {
    console.error('Error merging images:', error);
    throw error;
  }
}