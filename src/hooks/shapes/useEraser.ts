import { useCallback } from 'react';
import { useStore } from '../../store';
import { ImageCanvasRefs } from './useImageCanvas';
import { updateImageShapePreview } from '../../utils/imageShapeCanvas';

interface UseEraserProps {
  refs: ImageCanvasRefs;
  reapplyMask: () => void;
}

export const useEraser = ({ refs, reapplyMask }: UseEraserProps) => {
  const handleEraserStroke = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const maskCanvas = refs.maskCanvasRef.current;
    const permanentStrokesCanvas = refs.permanentStrokesCanvasRef.current;
    if (!maskCanvas || !permanentStrokesCanvas) return;

    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    const permanentCtx = permanentStrokesCanvas.getContext('2d', { willReadFrequently: true });
    if (!maskCtx || !permanentCtx) return;

    // Get the position relative to the canvas
    const rect = maskCanvas.getBoundingClientRect();
    const scaleX = maskCanvas.width / rect.width;
    const scaleY = maskCanvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const brushSize = useStore.getState().brushSize;
    const unEraseMode = useStore.getState().unEraseMode;
    const maskMode = useStore.getState().maskMode;
    const brushOpacity = useStore.getState().brushOpacity;

    if (maskMode) {
      // Mask mode - affect the image transparency
      maskCtx.save();
      
      // Only use un-erase mode if mask mode is enabled
      if (unEraseMode && maskMode) {
        // For un-erase mode, use source-over with white color to restore opacity
        maskCtx.globalCompositeOperation = 'source-over';
        maskCtx.fillStyle = `rgba(255, 255, 255, ${brushOpacity})`;
      } else {
        // For erase mode, use destination-out to remove opacity
        maskCtx.globalCompositeOperation = 'destination-out';
        maskCtx.globalAlpha = brushOpacity;
      }
      
      maskCtx.beginPath();
      maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      maskCtx.fill();
      maskCtx.restore();

      // Update the mask and preview
      reapplyMask();

      // Update preview in real-time for both erasing and un-erasing
      updateImageShapePreview({
        backgroundCanvasRef: refs.backgroundCanvasRef,
        permanentStrokesCanvasRef: refs.permanentStrokesCanvasRef,
        activeStrokeCanvasRef: refs.activeStrokeCanvasRef,
        previewCanvasRef: refs.previewCanvasRef,
        maskCanvasRef: refs.maskCanvasRef,
        tool: unEraseMode ? 'brush' : 'eraser',
        opacity: brushOpacity
      });
    } else {
      // Non-mask mode - only affect brush strokes
      permanentCtx.save();
      permanentCtx.globalCompositeOperation = 'destination-out';
      permanentCtx.globalAlpha = brushOpacity;
      
      permanentCtx.beginPath();
      permanentCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      permanentCtx.fill();
      permanentCtx.restore();

      // Update preview to show the erased strokes
      updateImageShapePreview({
        backgroundCanvasRef: refs.backgroundCanvasRef,
        permanentStrokesCanvasRef: refs.permanentStrokesCanvasRef,
        activeStrokeCanvasRef: refs.activeStrokeCanvasRef,
        previewCanvasRef: refs.previewCanvasRef,
        maskCanvasRef: refs.maskCanvasRef,
        tool: 'eraser',
        opacity: brushOpacity
      });
    }
  }, [refs, reapplyMask]);

  return {
    handleEraserStroke
  };
}; 