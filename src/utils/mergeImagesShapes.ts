import { Shape } from "../types";
import { supabase } from "../lib/supabase";

export async function mergeImages(images: Shape[]): Promise<Shape> {
  try {
    // Find the absolute bounds of all images in their display coordinates
    const minX = Math.min(...images.map(img => img.position.x));
    const minY = Math.min(...images.map(img => img.position.y));
    const maxX = Math.max(...images.map(img => img.position.x + img.width));
    const maxY = Math.max(...images.map(img => img.position.y + img.height));

    // Calculate raw dimensions for the final shape
    const rawWidth = maxX - minX;
    const rawHeight = maxY - minY;

    // Create canvas with raw dimensions initially
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = rawWidth;
    tempCanvas.height = rawHeight;
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) {
      throw new Error('Could not get canvas context');
    }

    // Process each image at original scale first
    for (const shape of images) {
      // Get all canvas layers
      const backgroundCanvas = document.querySelector(`canvas[data-shape-id="${shape.id}"][data-layer="background"]`) as HTMLCanvasElement;
      const permanentStrokesCanvas = document.querySelector(`canvas[data-shape-id="${shape.id}"][data-layer="permanent"]`) as HTMLCanvasElement;
      const maskCanvas = document.querySelector(`canvas[data-shape-id="${shape.id}"][data-layer="mask"]`) as HTMLCanvasElement;

      if (!backgroundCanvas || !permanentStrokesCanvas || !maskCanvas) {
        console.error('Required canvas layers not found for shape:', shape.id);
        continue;
      }

      // Calculate the exact position relative to the merged canvas
      const relativeX = shape.position.x - minX;
      const relativeY = shape.position.y - minY;

      // Create an intermediate canvas for this shape's composition
      const shapeCanvas = document.createElement('canvas');
      shapeCanvas.width = shape.width;
      shapeCanvas.height = shape.height;
      const shapeCtx = shapeCanvas.getContext('2d');
      if (!shapeCtx) continue;

      // Draw each layer at original scale
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

      // Draw the composited shape onto the temp canvas at exact position
      tempCtx.drawImage(shapeCanvas, relativeX, relativeY);
    }

    // Now create the final canvas with standardized dimensions
    const finalCanvas = document.createElement('canvas');
    const targetWidth = 512; // Standard width
    const targetHeight = Math.round(targetWidth * (rawHeight / rawWidth));
    
    finalCanvas.width = targetWidth;
    finalCanvas.height = targetHeight;
    const finalCtx = finalCanvas.getContext('2d');

    if (!finalCtx) {
      throw new Error('Could not get final canvas context');
    }

    // Draw the temp canvas onto the final canvas, scaling it to the standard size
    finalCtx.drawImage(
      tempCanvas,
      0, 0, rawWidth, rawHeight,
      0, 0, targetWidth, targetHeight
    );

    // Convert the merged image to a blob and upload
    const blob = await new Promise<Blob>((resolve, reject) => {
      finalCanvas.toBlob(
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