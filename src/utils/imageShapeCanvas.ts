import { RefObject } from 'react';

export interface ImageShapeCanvasRefs {
  backgroundCanvasRef: RefObject<HTMLCanvasElement>;
  permanentStrokesCanvasRef: RefObject<HTMLCanvasElement>;
  activeStrokeCanvasRef: RefObject<HTMLCanvasElement>;
  previewCanvasRef: RefObject<HTMLCanvasElement>;
  maskCanvasRef?: RefObject<HTMLCanvasElement>;
  redBackgroundCanvasRef?: RefObject<HTMLCanvasElement>;
}

export interface Point {
  x: number;
  y: number;
  angle?: number;
}

export const getImageShapeCanvasContext = (
  canvasRef: RefObject<HTMLCanvasElement>,
  options: CanvasRenderingContext2DSettings = { willReadFrequently: true }
): CanvasRenderingContext2D | null => {
  return canvasRef.current?.getContext('2d', options) || null;
};

export const clearImageShapeCanvas = (canvasRef: RefObject<HTMLCanvasElement>) => {
  const ctx = getImageShapeCanvasContext(canvasRef);
  if (!ctx || !canvasRef.current) return;

  ctx.clearRect(
    0,
    0,
    canvasRef.current.width,
    canvasRef.current.height
  );
};

export const getScaledPoint = (
  e: React.PointerEvent<HTMLCanvasElement>
): Point | null => {
  const canvas = e.currentTarget;
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
};

export const updateImageShapePreview = ({
  backgroundCanvasRef,
  permanentStrokesCanvasRef,
  activeStrokeCanvasRef,
  previewCanvasRef,
  maskCanvasRef,
  tool,
  opacity = 1,
  contrast = 1.0,
  saturation = 1.0,
  brightness = 1.0
}: ImageShapeCanvasRefs & { 
  tool: string; 
  opacity?: number;
  contrast?: number;
  saturation?: number;
  brightness?: number;
}) => {
  const previewCtx = getImageShapeCanvasContext(previewCanvasRef);
  if (!previewCtx || !previewCanvasRef.current) return;

  // Use requestAnimationFrame for smoother updates
  requestAnimationFrame(() => {
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;

    // Store original dimensions
    const originalWidth = previewCanvas.width;
    const originalHeight = previewCanvas.height;

    // 1. Clear the preview canvas
    previewCtx.clearRect(0, 0, originalWidth, originalHeight);

    // Apply shader filters
    previewCtx.filter = `contrast(${contrast}) saturate(${saturation}) brightness(${brightness})`;

    // 2. Draw background with NO opacity changes
    previewCtx.globalAlpha = 1;
    previewCtx.globalCompositeOperation = 'source-over';
    
    if (backgroundCanvasRef.current) {
      previewCtx.drawImage(backgroundCanvasRef.current, 0, 0, originalWidth, originalHeight);
    }

    // 3. Draw permanent strokes with NO opacity changes
    if (permanentStrokesCanvasRef.current) {
      // Ensure we maintain the original dimensions when drawing permanent strokes
      previewCtx.drawImage(
        permanentStrokesCanvasRef.current,
        0, 0, permanentStrokesCanvasRef.current.width, permanentStrokesCanvasRef.current.height,
        0, 0, originalWidth, originalHeight
      );
    }

    // 4. Draw active stroke with opacity
    if (activeStrokeCanvasRef.current) {
      previewCtx.globalAlpha = opacity;
      previewCtx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
      // Ensure we maintain the original dimensions when drawing active strokes
      previewCtx.drawImage(
        activeStrokeCanvasRef.current,
        0, 0, activeStrokeCanvasRef.current.width, activeStrokeCanvasRef.current.height,
        0, 0, originalWidth, originalHeight
      );
    }

    // Reset filter after drawing
    previewCtx.filter = 'none';

    // 5. Apply mask using CSS transforms for better performance
    if (maskCanvasRef?.current) {
      const maskUrl = maskCanvasRef.current.toDataURL();
      // Apply mask to the preview canvas
      previewCanvas.style.webkitMaskImage = `url(${maskUrl})`;
      previewCanvas.style.maskImage = `url(${maskUrl})`;
      previewCanvas.style.webkitMaskSize = 'cover';
      previewCanvas.style.maskSize = 'cover';
      previewCanvas.style.webkitMaskPosition = 'center';
      previewCanvas.style.maskPosition = 'center';
      previewCanvas.style.transform = 'translateZ(0)'; // Force GPU acceleration
    } else {
      // If no mask, ensure the preview is fully visible
      previewCanvas.style.webkitMaskImage = 'none';
      previewCanvas.style.maskImage = 'none';
    }
  });
};

export const saveImageShapeState = (
  refs: ImageShapeCanvasRefs,
  shapeId: string,
  updateShape: (id: string, data: { 
    canvasData?: string;
    backgroundCanvasData?: string;
    permanentCanvasData?: string;
    activeCanvasData?: string;
    previewCanvasData?: string;
    maskCanvasData?: string;
    redBackgroundCanvasData?: string;
    contrast?: number;
    saturation?: number;
    brightness?: number;
  }) => void,
  shaderParams?: {
    contrast?: number;
    saturation?: number;
    brightness?: number;
  }
) => {
  if (!refs.backgroundCanvasRef.current || !refs.permanentStrokesCanvasRef.current) return;

  // Save each layer separately
  const canvasData: Record<string, string | number | null> = {};
  
  // Save background
  if (refs.backgroundCanvasRef.current) {
    canvasData.backgroundCanvasData = refs.backgroundCanvasRef.current.toDataURL("image/jpeg", 0.7);
  }
  
  // Save permanent strokes
  if (refs.permanentStrokesCanvasRef.current) {
    canvasData.permanentCanvasData = refs.permanentStrokesCanvasRef.current.toDataURL("image/png");
  }
  
  // Save active stroke
  if (refs.activeStrokeCanvasRef.current) {
    canvasData.activeCanvasData = refs.activeStrokeCanvasRef.current.toDataURL("image/png");
  }
  
  // Save preview
  if (refs.previewCanvasRef.current) {
    canvasData.previewCanvasData = refs.previewCanvasRef.current.toDataURL("image/jpeg", 0.7);
  }
  
  // Save mask (most important for the eraser functionality)
  if (refs.maskCanvasRef?.current) {
    canvasData.maskCanvasData = refs.maskCanvasRef.current.toDataURL("image/png");
  }
  
  // Save red background
  if (refs.redBackgroundCanvasRef?.current) {
    canvasData.redBackgroundCanvasData = refs.redBackgroundCanvasRef.current.toDataURL("image/jpeg", 0.7);
  }

  // Include shader parameters if provided
  if (shaderParams) {
    if (shaderParams.contrast !== undefined) {
      canvasData.contrast = shaderParams.contrast;
    }
    if (shaderParams.saturation !== undefined) {
      canvasData.saturation = shaderParams.saturation;
    }
    if (shaderParams.brightness !== undefined) {
      canvasData.brightness = shaderParams.brightness;
    }
  }

  // Update shape with all canvas data
  updateShape(shapeId, canvasData as {
    canvasData?: string;
    backgroundCanvasData?: string;
    permanentCanvasData?: string;
    activeCanvasData?: string;
    previewCanvasData?: string;
    maskCanvasData?: string;
    redBackgroundCanvasData?: string;
    contrast?: number;
    saturation?: number;
    brightness?: number;
  });
};

/**
 * Ensures a mask canvas contains only binary values (fully opaque or fully transparent)
 * This prevents issues with alpha blending when toggling between inpaint modes
 */
export const ensureBinaryMask = (canvasRef: RefObject<HTMLCanvasElement>, threshold: number = 0.5) => {
  const ctx = getImageShapeCanvasContext(canvasRef);
  if (!ctx || !canvasRef.current) return;
  
  const { width, height } = canvasRef.current;
  
  // Get current pixel data
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Process each pixel to ensure it's either fully opaque or fully transparent
  for (let i = 0; i < data.length; i += 4) {
    // Check alpha channel (index i+3)
    const alpha = data[i+3] / 255; // Normalize to 0-1 range
    
    // Apply threshold - if over threshold, make fully opaque (white), otherwise fully transparent
    if (alpha > threshold) {
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
  ctx.putImageData(imageData, 0, 0);
};

/**
 * Resets a mask canvas to fully white (fully opaque)
 * Used when we want to start with a clean mask
 */
export const resetMask = (canvasRef: RefObject<HTMLCanvasElement>) => {
  const ctx = getImageShapeCanvasContext(canvasRef);
  if (!ctx || !canvasRef.current) return;
  
  const { width, height } = canvasRef.current;
  
  // Clear the canvas
  ctx.clearRect(0, 0, width, height);
  
  // Fill with white
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);
}; 