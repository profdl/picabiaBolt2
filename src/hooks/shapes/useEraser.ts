import { useCallback } from 'react';
import { useStore } from '../../store';
import { ImageCanvasRefs } from './useImageCanvas';

interface UseEraserProps {
  refs: ImageCanvasRefs;
  reapplyMask: () => void;
}

export const useEraser = ({ refs, reapplyMask }: UseEraserProps) => {
  const handleEraserStroke = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const maskCanvas = refs.maskCanvasRef.current;
    if (!maskCanvas) return;

    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!maskCtx) return;

    // Get the position relative to the canvas
    const rect = maskCanvas.getBoundingClientRect();
    const scaleX = maskCanvas.width / rect.width;
    const scaleY = maskCanvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Draw transparent/black circle at the eraser position to hide the image
    maskCtx.save();
    maskCtx.globalCompositeOperation = 'destination-out';  // This will erase from the mask
    const brushSize = useStore.getState().brushSize;
    maskCtx.beginPath();
    maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    maskCtx.fill();
    maskCtx.restore();

    // Update the mask
    reapplyMask();
  }, [refs.maskCanvasRef, reapplyMask]);

  return {
    handleEraserStroke
  };
}; 