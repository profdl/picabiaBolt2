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
  if (!previewCtx || !previewCanvasRef.current || !activeStrokeCanvasRef.current) return;

  // 1. Clear the preview canvas
  previewCtx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);

  // 2. Draw background and permanent strokes with NO opacity changes
  previewCtx.globalAlpha = 1;
  previewCtx.globalCompositeOperation = 'source-over';
  if (backgroundCanvasRef.current) {
    previewCtx.drawImage(backgroundCanvasRef.current, 0, 0);
  }
  if (permanentStrokesCanvasRef.current) {
    previewCtx.drawImage(permanentStrokesCanvasRef.current, 0, 0);
  }

  // 3. Create a temporary canvas for the active stroke with opacity
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = activeStrokeCanvasRef.current.width;
  tempCanvas.height = activeStrokeCanvasRef.current.height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  
  if (tempCtx) {
    // Draw active stroke to temp canvas
    tempCtx.globalAlpha = opacity;
    tempCtx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    tempCtx.drawImage(activeStrokeCanvasRef.current, 0, 0);
    
    // Draw temp canvas (with opacity) onto preview
    previewCtx.globalAlpha = 1; // Keep preview at full opacity
    previewCtx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    previewCtx.drawImage(tempCanvas, 0, 0);
  }

  // 4. Apply mask only to the preview canvas, not affecting the noise layer
  if (previewCanvasRef.current && maskCanvasRef?.current) {
    previewCanvasRef.current.style.webkitMaskImage = `url(${maskCanvasRef.current.toDataURL()})`;
    previewCanvasRef.current.style.maskImage = `url(${maskCanvasRef.current.toDataURL()})`;
    previewCanvasRef.current.style.webkitMaskSize = 'cover';
    previewCanvasRef.current.style.maskSize = 'cover';
    previewCanvasRef.current.style.webkitMaskPosition = 'center';
    previewCanvasRef.current.style.maskPosition = 'center';
  }
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