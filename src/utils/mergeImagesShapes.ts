import { Shape } from '../types';
import { supabase } from '../lib/supabase/client'


export async function mergeImages(images: Shape[]): Promise<Shape> {
  try {
    // Find the top-left most position among all images
    const minX = Math.min(...images.map(img => img.position.x));
    const minY = Math.min(...images.map(img => img.position.y));

    // Create new canvas for the merged result
    const canvas = document.createElement('canvas');
    const maxRight = Math.max(...images.map(img => img.position.x + img.width)) - minX;
    const maxBottom = Math.max(...images.map(img => img.position.y + img.height)) - minY;
    canvas.width = maxRight;
    canvas.height = maxBottom;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Process each image
    for (const shape of images) {
      // Get the preview canvas which contains all layers composited
      const previewCanvas = document.querySelector(`canvas[data-shape-id="${shape.id}"]`) as HTMLCanvasElement;
      if (!previewCanvas) {
        console.error('Preview canvas not found for shape:', shape.id);
        continue;
      }

      // Get the mask canvas
      const shapeContainer = previewCanvas.parentElement;
      const maskCanvas = shapeContainer?.querySelector('canvas[style*="visibility: hidden"][style*="z-index: 1"]') as HTMLCanvasElement;

      // Create a temporary canvas to combine preview and mask
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = previewCanvas.width;
      tempCanvas.height = previewCanvas.height;
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

      if (!tempCtx) {
        console.error('Could not get temp canvas context');
        continue;
      }

      // Draw the preview canvas first
      tempCtx.drawImage(previewCanvas, 0, 0);

      // Apply mask if it exists
      if (maskCanvas) {
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(maskCanvas, 0, 0);
        tempCtx.globalCompositeOperation = 'source-over';
      }

      // Calculate position relative to the top-left most image
      const relativeX = shape.position.x - minX;
      const relativeY = shape.position.y - minY;

      // Draw the masked preview at the correct position
      ctx.drawImage(
        tempCanvas,
        relativeX,
        relativeY,
        shape.width,
        shape.height
      );
    }

    // Convert the merged image to a blob
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

    const { error: dbError } = await supabase.from("assets").insert([
      {
        url: publicUrl,
        user_id: user.id,
      },
    ]);

    if (dbError) throw dbError;

    // Calculate position for the new shape
    const rightmostEdge = Math.max(...images.map(img => img.position.x + img.width));
    const averageY = images.reduce((sum, img) => sum + img.position.y, 0) / images.length;
    
    const PADDING = 20;
    const newPosition = {
      x: rightmostEdge + PADDING,
      y: averageY,
    };

    // Create the new shape with the merged image
    const newShape: Shape = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'image',
      position: newPosition,
      width: maxRight,
      height: maxBottom,
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