import { Shape } from "../types";
import { supabase } from "../lib/supabase";

export async function mergeImages(images: Shape[]): Promise<Shape> {
  try {
    // Find the absolute bounds in display coordinates
    const minX = Math.min(...images.map(img => img.position.x));
    const minY = Math.min(...images.map(img => img.position.y));
    const maxX = Math.max(...images.map(img => img.position.x + img.width));
    const maxY = Math.max(...images.map(img => img.position.y + img.height));

    // Calculate raw dimensions in display coordinates
    const displayWidth = maxX - minX;
    const displayHeight = maxY - minY;

    // Create a high-resolution canvas (2x the display size for better quality)
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = displayWidth * 2;
    tempCanvas.height = displayHeight * 2;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    if (!tempCtx) {
      throw new Error('Could not get canvas context');
    }

    // Scale up the context for high-resolution drawing
    tempCtx.scale(2, 2);

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

      // Calculate the relative position in display coordinates
      const relativeX = shape.position.x - minX;
      const relativeY = shape.position.y - minY;

      // Create an intermediate canvas for this shape's composition
      const shapeCanvas = document.createElement('canvas');
      shapeCanvas.width = shape.width * 2; // 2x size for quality
      shapeCanvas.height = shape.height * 2;
      const shapeCtx = shapeCanvas.getContext('2d', { willReadFrequently: true });
      if (!shapeCtx) continue;

      // Scale up the shape context
      shapeCtx.scale(2, 2);

      // Draw each layer with high-quality scaling
      // 1. Draw background
      shapeCtx.drawImage(
        backgroundCanvas,
        0, 0, backgroundCanvas.width, backgroundCanvas.height,
        0, 0, shape.width, shape.height
      );

      // 2. Draw permanent strokes
      shapeCtx.drawImage(
        permanentStrokesCanvas,
        0, 0, permanentStrokesCanvas.width, permanentStrokesCanvas.height,
        0, 0, shape.width, shape.height
      );

      // 3. Apply mask
      shapeCtx.globalCompositeOperation = 'destination-in';
      shapeCtx.drawImage(
        maskCanvas,
        0, 0, maskCanvas.width, maskCanvas.height,
        0, 0, shape.width, shape.height
      );
      shapeCtx.globalCompositeOperation = 'source-over';

      // Draw the composited shape onto the temp canvas
      tempCtx.drawImage(shapeCanvas, relativeX, relativeY);
    }

    // Convert the merged image to a blob and upload with maximum quality
    const blob = await new Promise<Blob>((resolve, reject) => {
      tempCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png',
        1.0  // Use maximum quality
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

    // Create new shape with display dimensions
    const newShape: Shape = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'image',
      position: {
        x: maxX + 20,
        y: minY,
      },
      width: displayWidth,
      height: displayHeight,
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