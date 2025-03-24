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
  opacity = 1
}: ImageShapeCanvasRefs & { tool: string; opacity?: number }) => {
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
  }) => void
) => {
  if (!refs.backgroundCanvasRef.current || !refs.permanentStrokesCanvasRef.current) return;

  // Save each layer separately
  const canvasData: Record<string, string | null> = {};
  
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

  // Update shape with all canvas data
  updateShape(shapeId, canvasData);
}; 