import { ImageShape } from "../types/shapes";
import { supabase } from "../lib/supabase";

export async function mergeImages(images: ImageShape[]): Promise<ImageShape> {
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
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    if (!tempCtx) {
      throw new Error('Could not get canvas context');
    }

    // Process each image at original scale first
    for (const shape of images) {
      // Get all canvas layers
      const backgroundCanvas = document.querySelector(`canvas[data-shape-id="${shape.id}"][data-layer="background"]`) as HTMLCanvasElement;
      const permanentStrokesCanvas = document.querySelector(`canvas[data-shape-id="${shape.id}"][data-layer="permanent"]`) as HTMLCanvasElement;
      const maskCanvas = document.querySelector(`canvas[data-shape-id="${shape.id}"][data-layer="mask"]`) as HTMLCanvasElement;
      // Get the preview canvas which already has filters applied
      const previewCanvas = document.querySelector(`canvas[data-shape-id="${shape.id}"][data-layer="preview"]`) as HTMLCanvasElement;

      if (!backgroundCanvas || !permanentStrokesCanvas || !maskCanvas) {
        console.error('Required canvas layers not found for shape:', shape.id);
        continue;
      }

      // Calculate the exact position relative to the merged canvas
      const relativeX = shape.position.x - minX;
      const relativeY = shape.position.y - minY;

      // Create an intermediate canvas for this shape's composition at original canvas size
      const shapeCanvas = document.createElement('canvas');
      shapeCanvas.width = backgroundCanvas.width;
      shapeCanvas.height = backgroundCanvas.height;
      const shapeCtx = shapeCanvas.getContext('2d', { willReadFrequently: true });
      if (!shapeCtx) continue;

      // If we have a preview canvas with filters already applied, use it
      if (previewCanvas) {
        shapeCtx.drawImage(previewCanvas, 0, 0);
      } else {
        // Otherwise apply the filters manually
        // Draw each layer at original canvas dimensions
        // 1. Draw background
        shapeCtx.drawImage(backgroundCanvas, 0, 0);

        // 2. Draw permanent strokes
        shapeCtx.drawImage(permanentStrokesCanvas, 0, 0);

        // 3. Apply mask
        shapeCtx.globalCompositeOperation = 'destination-in';
        shapeCtx.drawImage(maskCanvas, 0, 0);
        shapeCtx.globalCompositeOperation = 'source-over';

        // Apply CSS filters instead of WebGL for simplicity and consistency
        if (shape.contrast !== undefined || shape.saturation !== undefined || shape.brightness !== undefined) {
          const tempFilterCanvas = document.createElement('canvas');
          tempFilterCanvas.width = shapeCanvas.width;
          tempFilterCanvas.height = shapeCanvas.height;
          const tempFilterCtx = tempFilterCanvas.getContext('2d');
          
          if (tempFilterCtx) {
            // Apply filters using CSS filter
            tempFilterCtx.filter = `contrast(${shape.contrast ?? 1.0}) saturate(${shape.saturation ?? 1.0}) brightness(${shape.brightness ?? 1.0})`;
            tempFilterCtx.drawImage(shapeCanvas, 0, 0);
            
            // Draw back to shape canvas
            shapeCtx.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);
            shapeCtx.drawImage(tempFilterCanvas, 0, 0);
          }
        }
      }

      // Calculate the scale to maintain original quality
      const scaleX = shape.width / backgroundCanvas.width;
      const scaleY = shape.height / backgroundCanvas.height;

      // Draw the composited shape onto the temp canvas at exact position with proper scaling
      tempCtx.save();
      tempCtx.translate(relativeX, relativeY);
      tempCtx.scale(scaleX, scaleY);
      tempCtx.drawImage(shapeCanvas, 0, 0);
      tempCtx.restore();
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

    // Create new shape with raw dimensions
    const newShape: ImageShape = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'image',
      position: {
        x: maxX + 20,
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
      isMerged: true,
      // Reset shader settings to defaults for the merged image
      contrast: 1.0,
      saturation: 1.0, 
      brightness: 1.0,
      imagePromptStrength: 0.75
    };

    return newShape;
  } catch (error) {
    console.error('Error merging images:', error);
    throw error;
  }
}