import { Shape } from "../../types";

interface CanvasLayers {
  preview?: HTMLCanvasElement;
  mask?: HTMLCanvasElement;
  background?: HTMLCanvasElement;
  permanent?: HTMLCanvasElement;
}

/**
 * Gets canvas elements for a shape by its ID and layer types
 */
export const getShapeCanvases = (shapeId: string): CanvasLayers => {
  const previewCanvas = document.querySelector(`canvas[data-shape-id="${shapeId}"][data-layer="preview"]`) as HTMLCanvasElement;
  const maskCanvas = document.querySelector(`canvas[data-shape-id="${shapeId}"][data-layer="mask"]`) as HTMLCanvasElement;
  const backgroundCanvas = document.querySelector(`canvas[data-shape-id="${shapeId}"][data-layer="background"]`) as HTMLCanvasElement;
  const permanentStrokesCanvas = document.querySelector(`canvas[data-shape-id="${shapeId}"][data-layer="permanent"]`) as HTMLCanvasElement;

  return {
    preview: previewCanvas,
    mask: maskCanvas,
    background: backgroundCanvas,
    permanent: permanentStrokesCanvas
  };
};

/**
 * Creates a temporary canvas with combined background and permanent strokes
 */
export const createCombinedCanvas = (background: HTMLCanvasElement, permanent?: HTMLCanvasElement): HTMLCanvasElement => {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = background.width;
  tempCanvas.height = background.height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  
  if (!tempCtx) {
    throw new Error('Failed to create temporary canvas context');
  }

  // Draw background first
  tempCtx.drawImage(background, 0, 0);
  
  // Draw permanent strokes on top if available
  if (permanent) {
    tempCtx.drawImage(permanent, 0, 0);
  }

  return tempCanvas;
};

/**
 * Processes a mask canvas to ensure binary values (fully opaque white or fully transparent)
 */
export const processBinaryMask = (maskCanvas: HTMLCanvasElement): void => {
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!maskCtx) {
    throw new Error('Failed to get mask canvas context');
  }

  const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const data = imageData.data;
  
  // Process each pixel to ensure it's either fully opaque white or fully transparent
  for (let i = 0; i < data.length; i += 4) {
    // Check alpha channel (index i+3)
    const alpha = data[i+3] / 255; // Normalize to 0-1 range
    
    // Apply threshold - if over threshold, make fully opaque white, otherwise fully transparent
    if (alpha > 0.5) {
      // Fully opaque white
      data[i] = 255;     // R
      data[i+1] = 255;   // G
      data[i+2] = 255;   // B
      data[i+3] = 255;   // A
    } else {
      // Fully transparent
      data[i+3] = 0;     // A
    }
  }
  
  // Put the modified pixel data back on the canvas
  maskCtx.putImageData(imageData, 0, 0);
};

/**
 * Converts a canvas to a blob with specified format and quality
 */
export const canvasToBlob = async (canvas: HTMLCanvasElement, type: string = 'image/png', quality: number = 1.0): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob from canvas'));
      }
    }, type, quality);
  });
};

/**
 * Checks if a mask canvas contains any black pixels
 */
export const hasBlackPixelsInMask = async (maskCanvas: HTMLCanvasElement): Promise<boolean> => {
  const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to get mask canvas context');
  }

  const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const data = imageData.data;

  // Check for any non-white, non-transparent pixels
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // If pixel is not white (255,255,255) and not transparent (a=0)
    if (a > 0 && (r < 255 || g < 255 || b < 255)) {
      return true;
    }
  }

  return false;
};

/**
 * Prepares canvases for image generation
 */
export const prepareCanvasesForGeneration = async (shape: Shape): Promise<{
  sourceBlob?: Blob;
  maskBlob?: Blob;
  hasBlackPixels: boolean;
}> => {
  const canvases = getShapeCanvases(shape.id);
  
  if (!canvases.preview || !canvases.mask || !canvases.background) {
    throw new Error('Required canvases not found for shape');
  }

  const hasBlackPixels = await hasBlackPixelsInMask(canvases.mask);
  
  // Create combined canvas for source
  const combinedCanvas = createCombinedCanvas(canvases.background, canvases.permanent);
  
  // Process mask if needed
  if (hasBlackPixels) {
    processBinaryMask(canvases.mask);
  }

  // Convert canvases to blobs
  const [sourceBlob, maskBlob] = await Promise.all([
    canvasToBlob(combinedCanvas),
    hasBlackPixels ? canvasToBlob(canvases.mask) : undefined
  ]);

  return {
    sourceBlob,
    maskBlob,
    hasBlackPixels
  };
};

/**
 * Creates a properly formatted inpainting mask canvas (black areas will be inpainted, white preserved)
 */
export const createInpaintMask = (maskCanvas: HTMLCanvasElement): HTMLCanvasElement => {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = maskCanvas.width;
  tempCanvas.height = maskCanvas.height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  
  if (!tempCtx) {
    throw new Error('Failed to create temporary canvas context');
  }

  // First fill with white (areas to preserve)
  tempCtx.fillStyle = '#ffffff';
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  
  // Get mask data
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!maskCtx) {
    throw new Error('Failed to get mask canvas context');
  }
  
  const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const data = imageData.data;
  const tempImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const tempData = tempImageData.data;
  
  // Process mask - any transparent areas in the mask become black in the inpaint mask
  for (let i = 0; i < data.length; i += 4) {
    // If pixel is transparent or black in mask (alpha < 10 or RGB values all < 10)
    if (data[i+3] < 10 || (data[i] < 10 && data[i+1] < 10 && data[i+2] < 10)) {
      // Make it black in inpaint mask (areas to inpaint)
      tempData[i] = 0;     // R
      tempData[i+1] = 0;   // G
      tempData[i+2] = 0;   // B
      tempData[i+3] = 255; // A (fully opaque)
    } else {
      // Otherwise make it white (areas to preserve)
      tempData[i] = 255;   // R
      tempData[i+1] = 255; // G
      tempData[i+2] = 255; // B
      tempData[i+3] = 255; // A (fully opaque)
    }
  }
  
  // Put the processed data back
  tempCtx.putImageData(tempImageData, 0, 0);
  
  return tempCanvas;
};

/**
 * Creates a clean full source image without any masking
 */
export const createFullSourceImage = (shape: Shape): HTMLCanvasElement => {
  const canvases = getShapeCanvases(shape.id);
  
  if (!canvases.background) {
    throw new Error('Background canvas not found for shape');
  }
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvases.background.width;
  tempCanvas.height = canvases.background.height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  
  if (!tempCtx) {
    throw new Error('Failed to create temporary canvas context');
  }
  
  // Draw background first
  tempCtx.drawImage(canvases.background, 0, 0);
  
  // Add permanent strokes if available
  if (canvases.permanent) {
    tempCtx.drawImage(canvases.permanent, 0, 0);
  }
  
  // Ensure the image is fully opaque
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    data[i+3] = 255; // Set alpha to fully opaque
  }
  
  tempCtx.putImageData(imageData, 0, 0);
  
  return tempCanvas;
};

/**
 * Specialized function for preparing canvases for inpainting
 */
export const prepareCanvasesForInpainting = async (shape: Shape): Promise<{
  sourceBlob: Blob;
  maskBlob: Blob;
}> => {
  const canvases = getShapeCanvases(shape.id);
  
  if (!canvases.mask) {
    throw new Error('Mask canvas not found for shape');
  }
  
  // Create proper source and mask canvases
  const sourceCanvas = createFullSourceImage(shape);
  const inpaintMaskCanvas = createInpaintMask(canvases.mask);
  
  // Convert to blobs
  const [sourceBlob, maskBlob] = await Promise.all([
    canvasToBlob(sourceCanvas),
    canvasToBlob(inpaintMaskCanvas)
  ]);
  
  return {
    sourceBlob,
    maskBlob
  };
}; 