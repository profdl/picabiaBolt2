import { useCallback, useRef } from 'react';
import { useStore } from '../../store';
import { ImageCanvasRefs } from './useImageCanvas';
import { updateImageShapePreview, getScaledPoint } from '../../utils/imageShapeCanvas';
import { drawBrushStroke, drawBrushStamp, type BrushTextureType } from '../../utils/brushTexture';
import { ImageShape } from '../../types/shapes';

interface UseEraserProps {
  refs: ImageCanvasRefs;
}

// Create a proper stamp function for the eraser tool
// This will draw white with the brush texture, which works for erasers
const eraserStampFunction = (ctx: CanvasRenderingContext2D, x: number, y: number, _color: string, size: number) => {
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fill();
};

export const useEraser = ({ refs }: UseEraserProps) => {
  // Track last point for proper stroke drawing using ref for persistence
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const handleEraserStroke = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const permanentStrokesCanvas = refs.permanentStrokesCanvasRef.current;
    if (!permanentStrokesCanvas) return;

    const permanentCtx = permanentStrokesCanvas.getContext('2d', { willReadFrequently: true });
    if (!permanentCtx) return;

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
      tool,
      shapes
    } = useStore.getState();
    
    // Only handle eraser operations
    if (tool === 'eraser') {
      // For eraser tool, only affect brush strokes
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

      // Get current shape to extract shader parameters
      const canvasElement = e.currentTarget;
      const shapeId = canvasElement.dataset.shapeId;
      const currentShape = shapeId ? shapes.find(s => s.id === shapeId) : null;
      
      // Safely extract shader parameters if it's an image shape
      let contrast = 1.0;
      let saturation = 1.0;
      let brightness = 1.0;
      
      if (currentShape && currentShape.type === 'image') {
        const imageShape = currentShape as ImageShape;
        contrast = imageShape.contrast ?? 1.0;
        saturation = imageShape.saturation ?? 1.0;
        brightness = imageShape.brightness ?? 1.0;
      }
      
      // Update preview to show the erased strokes
      updateImageShapePreview({
        backgroundCanvasRef: refs.backgroundCanvasRef,
        permanentStrokesCanvasRef: refs.permanentStrokesCanvasRef,
        activeStrokeCanvasRef: refs.activeStrokeCanvasRef,
        previewCanvasRef: refs.previewCanvasRef,
        maskCanvasRef: refs.maskCanvasRef,
        tool: 'eraser',
        opacity: brushOpacity,
        contrast,
        saturation,
        brightness
      });
    }

    // Update last point for next stroke segment
    lastPointRef.current = point;
  }, [refs]);

  // Add a function to reset the last point
  const resetEraserStroke = useCallback(() => {
    lastPointRef.current = null;
  }, []);

  return {
    handleEraserStroke,
    resetEraserStroke
  };
}; 