import { RefObject } from 'react';

export interface ImageShapeCanvasRefs {
  backgroundCanvasRef: RefObject<HTMLCanvasElement>;
  permanentStrokesCanvasRef: RefObject<HTMLCanvasElement>;
  activeStrokeCanvasRef: RefObject<HTMLCanvasElement>;
  previewCanvasRef: RefObject<HTMLCanvasElement>;
  maskCanvasRef?: RefObject<HTMLCanvasElement>;
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

  // Update the mask image on the preview canvas
  if (previewCanvasRef.current && maskCanvasRef?.current) {
    previewCanvasRef.current.style.webkitMaskImage = `url(${maskCanvasRef.current.toDataURL()})`;
    previewCanvasRef.current.style.maskImage = `url(${maskCanvasRef.current.toDataURL()})`;
  }
};

export const saveImageShapeState = (
  refs: ImageShapeCanvasRefs,
  shapeId: string,
  updateShape: (id: string, data: { canvasData: string }) => void
) => {
  if (!refs.backgroundCanvasRef.current || !refs.permanentStrokesCanvasRef.current) return;

  // Create a temporary canvas to combine background and permanent strokes
  const saveCanvas = document.createElement('canvas');
  saveCanvas.width = refs.backgroundCanvasRef.current.width;
  saveCanvas.height = refs.backgroundCanvasRef.current.height;
  const saveCtx = saveCanvas.getContext('2d', { willReadFrequently: true });
  if (!saveCtx) return;

  // Draw background first
  saveCtx.drawImage(refs.backgroundCanvasRef.current, 0, 0);
  
  // Draw permanent strokes on top
  saveCtx.drawImage(refs.permanentStrokesCanvasRef.current, 0, 0);
  
  // Save the combined result
  const canvasData = saveCanvas.toDataURL("image/png");
  updateShape(shapeId, { canvasData });
}; 