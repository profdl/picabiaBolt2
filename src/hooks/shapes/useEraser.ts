import { useCallback, useRef } from 'react';
import { useStore } from '../../store';
import { ImageCanvasRefs } from './useImageCanvas';
import { updateImageShapePreview, getScaledPoint } from '../../utils/imageShapeCanvas';
import { drawBrushStroke, drawBrushStamp, type BrushTextureType } from '../../utils/brushTexture';

interface UseEraserProps {
  refs: ImageCanvasRefs;
  reapplyMask: () => void;
}

// Create a proper stamp function for the eraser tool
// This will draw white with the brush texture, which works for erasers
const eraserStampFunction = (ctx: CanvasRenderingContext2D, x: number, y: number, _color: string, size: number) => {
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fill();
};

export const useEraser = ({ refs, reapplyMask }: UseEraserProps) => {
  // Track last point for proper stroke drawing using ref for persistence
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const handleEraserStroke = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const maskCanvas = refs.maskCanvasRef.current;
    const permanentStrokesCanvas = refs.permanentStrokesCanvasRef.current;
    if (!maskCanvas || !permanentStrokesCanvas) return;

    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    const permanentCtx = permanentStrokesCanvas.getContext('2d', { willReadFrequently: true });
    if (!maskCtx || !permanentCtx) return;

    // Get the position using the same scaled point function used by brush
    const point = getScaledPoint(e);
    if (!point) return;

    const {
      brushSize,
      brushTexture,
      brushRotation,
      brushFollowPath,
      brushSpacing,
      brushHardness,
      brushOpacity,
      unEraseMode,
      maskMode,
      tool
    } = useStore.getState();
    
    // For inpaint tool, always use mask mode (affect image transparency)
    if (maskMode || tool === 'inpaint') {
      // Mask mode - affect the image transparency
      maskCtx.save();
      
      // Determine if we're in un-erase mode based on the tool and explicit unEraseMode setting
      // Only apply restore mode to in-paint tool, not eraser tool (even in mask mode)
      const isRestoring = unEraseMode && tool === 'inpaint';
      
      if (isRestoring) {
        // For un-erase/restore mode, use source-over with white color to restore opacity
        maskCtx.globalCompositeOperation = 'source-over';
        // Use full opacity (1.0) for in-paint restore
        maskCtx.globalAlpha = tool === 'inpaint' ? 1.0 : brushOpacity;
      } else {
        // For erase mode, use destination-out to remove opacity
        maskCtx.globalCompositeOperation = 'destination-out';
        // Use full opacity (1.0) for in-paint erasing
        maskCtx.globalAlpha = tool === 'inpaint' ? 1.0 : brushOpacity;
      }
      
      // Use different approaches for inpaint vs eraser tools
      if (tool === 'inpaint') {
        // For inpaint tool, always use simple circular shape for better control
        if (lastPointRef.current) {
          // Draw a line between points for inpaint tool using simple circles
          const dx = point.x - lastPointRef.current.x;
          const dy = point.y - lastPointRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const steps = Math.max(1, Math.floor(distance / (brushSize / 4)));
          
          for (let i = 0; i <= steps; i++) {
            const x = lastPointRef.current.x + (dx * i / steps);
            const y = lastPointRef.current.y + (dy * i / steps);
            
            maskCtx.beginPath();
            maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
            maskCtx.fill();
          }
        } else {
          // First point for inpaint tool
          maskCtx.beginPath();
          maskCtx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
          maskCtx.fill();
        }
      } else if (lastPointRef.current) {
        // For eraser tool with previous point, use brush textures
        drawBrushStroke(
          maskCtx,
          lastPointRef.current,
          point,
          {
            size: brushSize,
            color: 'white', // Color doesn't matter for eraser operations
            hardness: brushHardness,
            rotation: brushRotation,
            followPath: brushFollowPath,
            spacing: brushSpacing
          },
          brushTexture as BrushTextureType,
          eraserStampFunction
        );
      } else {
        // For first point with eraser tool, use brush textures
        drawBrushStamp(
          { ctx: maskCtx, x: point.x, y: point.y },
          {
            size: brushSize,
            color: 'white',
            hardness: brushHardness,
            rotation: brushRotation,
            followPath: brushFollowPath
          },
          brushTexture as BrushTextureType,
          eraserStampFunction
        );
      }
      
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
        tool: tool,
        // Use full opacity for in-paint, normal opacity for other tools
        opacity: tool === 'inpaint' ? 1.0 : brushOpacity
      });
    } else if (tool === 'eraser') {
      // Non-mask mode eraser - only affect brush strokes
      permanentCtx.save();
      permanentCtx.globalCompositeOperation = 'destination-out';
      permanentCtx.globalAlpha = brushOpacity;
      
      // Use the same brush texture and settings as the brush tool
      if (lastPointRef.current) {
        // If we have a last point, draw a stroke
        drawBrushStroke(
          permanentCtx,
          lastPointRef.current,
          point,
          {
            size: brushSize,
            color: 'white', // Color doesn't matter for eraser operations
            hardness: brushHardness,
            rotation: brushRotation,
            followPath: brushFollowPath,
            spacing: brushSpacing
          },
          brushTexture as BrushTextureType,
          eraserStampFunction
        );
      } else {
        // For first point with eraser tool
        drawBrushStamp(
          { ctx: permanentCtx, x: point.x, y: point.y },
          {
            size: brushSize,
            color: 'white',
            hardness: brushHardness,
            rotation: brushRotation,
            followPath: brushFollowPath
          },
          brushTexture as BrushTextureType,
          eraserStampFunction
        );
      }
      
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

    // Update last point for next stroke segment
    lastPointRef.current = point;
  }, [refs, reapplyMask]);

  // Add a function to reset the last point
  const resetEraserStroke = useCallback(() => {
    lastPointRef.current = null;
  }, []);

  return {
    handleEraserStroke,
    resetEraserStroke
  };
}; 