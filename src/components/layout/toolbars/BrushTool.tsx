import { useRef, useEffect } from "react";
import { useStore } from "../../../store";
import { useMixboxBrush } from "../../../hooks/ui/useMixbox";
import { 
  getImageShapeCanvasContext, 
  clearImageShapeCanvas, 
  getScaledPoint,
  updateImageShapePreview,
  saveImageShapeState,
  ensureBinaryMask,
  type ImageShapeCanvasRefs,
  type Point
} from "../../../utils/imageShapeCanvas";
import { 
  preloadBrushTextures,
  drawBrushStamp,
  drawBrushStroke,
  type BrushTextureType
} from "../../../utils/brushTexture";
import { type MixboxDrawProps } from "../../../hooks/ui/useMixbox";

interface BrushHandlers {
  handlePointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerUpOrLeave: () => void;
}

const adaptMixboxStamp = (drawMixboxStamp: (props: MixboxDrawProps) => void) => {
  return (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size: number) => {
    drawMixboxStamp({
      ctx,
      x,
      y,
      color,
      opacity: 1,
      size
    });
  };
};

// Simple circular stamp for inpaint tool
const drawInpaintDot = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fill();
};

export const useBrush = ({
  backgroundCanvasRef,
  permanentStrokesCanvasRef,
  activeStrokeCanvasRef,
  previewCanvasRef,
  maskCanvasRef
}: ImageShapeCanvasRefs): BrushHandlers => {
  const isDrawing = useRef(false);
  const lastPoint = useRef<Point | null>(null);
  const accumulatedDistance = useRef(0);

  const {
    tool,
    currentColor,
    brushTexture,
    brushSize,
    brushOpacity,
    brushRotation,
    brushFollowPath,
    brushSpacing,
    brushHardness
  } = useStore((state) => ({
    tool: state.tool,
    currentColor: state.currentColor,
    brushTexture: state.brushTexture,
    brushSize: state.brushSize,
    brushOpacity: state.brushOpacity,
    brushRotation: state.brushRotation,
    brushFollowPath: state.brushFollowPath,
    brushSpacing: state.brushSpacing,
    brushHardness: state.brushHardness
  }));

  // Add cleanup effect when tool changes or component unmounts
  useEffect(() => {
    const cleanup = () => {
      isDrawing.current = false;
      lastPoint.current = null;
      accumulatedDistance.current = 0;

      // Clear active stroke canvas if it exists
      if (activeStrokeCanvasRef.current) {
        clearImageShapeCanvas(activeStrokeCanvasRef);
      }

      // Update preview if it exists
      if (previewCanvasRef.current) {
        updateImageShapePreview({
          backgroundCanvasRef,
          permanentStrokesCanvasRef,
          activeStrokeCanvasRef,
          previewCanvasRef,
          maskCanvasRef,
          tool: tool || 'brush'
        });
      }
    };

    // Clean up when tool changes away from brush/eraser/inpaint
    if (!tool || (tool !== 'brush' && tool !== 'eraser' && tool !== 'inpaint')) {
      cleanup();
    }

    // Clean up on unmount
    return cleanup;
  }, [activeStrokeCanvasRef, backgroundCanvasRef, permanentStrokesCanvasRef, previewCanvasRef, maskCanvasRef, tool]);

  // Preload brush textures
  useEffect(() => {
    preloadBrushTextures();
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== "brush" && tool !== "eraser" && tool !== "inpaint") return;
    const point = getScaledPoint(e);
    if (!point) return;

    isDrawing.current = true;
    lastPoint.current = point;

    // Clear active stroke canvas at the start of a new stroke
    if (activeStrokeCanvasRef.current) {
      clearImageShapeCanvas(activeStrokeCanvasRef);
      
      // Draw the initial dot at full opacity on active canvas
      drawBrushDot(activeStrokeCanvasRef.current, point);
      
      // Update preview with proper opacity
      updateImageShapePreview({
        backgroundCanvasRef,
        permanentStrokesCanvasRef,
        activeStrokeCanvasRef,
        previewCanvasRef,
        maskCanvasRef,
        tool,
        opacity: brushOpacity
      });

      // Save initial state to ensure it persists
      const shapeId = activeStrokeCanvasRef.current.dataset.shapeId;
      if (shapeId) {
        saveImageShapeState(
          {
            backgroundCanvasRef,
            permanentStrokesCanvasRef,
            activeStrokeCanvasRef,
            previewCanvasRef,
            maskCanvasRef
          },
          shapeId,
          useStore.getState().updateShape
        );
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPoint.current) return;
    if (tool !== "brush" && tool !== "eraser" && tool !== "inpaint") return;

    const point = getScaledPoint(e);
    if (!point) return;

    const activeCtx = getImageShapeCanvasContext(activeStrokeCanvasRef);
    if (activeCtx && lastPoint.current) {
      activeCtx.save();
      activeCtx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
      
      if (tool === "eraser") {
        // Handle erasing brush strokes
        if (activeStrokeCanvasRef.current && permanentStrokesCanvasRef.current) {
          const permanentCtx = getImageShapeCanvasContext(permanentStrokesCanvasRef);
          const activeCtx = getImageShapeCanvasContext(activeStrokeCanvasRef);
          
          if (activeCtx && permanentCtx) {
            // First apply opacity to active stroke
            activeCtx.save();
            activeCtx.globalAlpha = brushOpacity;
            activeCtx.drawImage(activeStrokeCanvasRef.current, 0, 0);
            activeCtx.restore();

            // Then apply eraser effect to permanent layer
            permanentCtx.save();
            permanentCtx.globalCompositeOperation = "destination-out";
            permanentCtx.drawImage(activeStrokeCanvasRef.current, 0, 0);
            permanentCtx.restore();
          }
        }

        // Clear active stroke
        clearImageShapeCanvas(activeStrokeCanvasRef);

        // Update preview with final state
        updateImageShapePreview({
          backgroundCanvasRef,
          permanentStrokesCanvasRef,
          activeStrokeCanvasRef,
          previewCanvasRef,
          maskCanvasRef,
          tool: "eraser",
          opacity: brushOpacity
        });
      } else if (tool === "inpaint") {
        // Handle mask mode inpainting
        if (maskCanvasRef && activeStrokeCanvasRef.current) {
          const maskCtx = getImageShapeCanvasContext(maskCanvasRef);
          if (maskCtx && maskCanvasRef.current) {
            const restoreMode = useStore.getState().inpaintRestoreMode;
            maskCtx.globalCompositeOperation = restoreMode ? "source-over" : "destination-out";
            maskCtx.globalAlpha = 1.0;
            maskCtx.drawImage(activeStrokeCanvasRef.current, 0, 0);
            
            // Ensure binary mask after update
            ensureBinaryMask(maskCanvasRef);
          }
        }

        // Clear active stroke before updating preview to prevent blinking
        clearImageShapeCanvas(activeStrokeCanvasRef);

        // Update preview with the mask changes
        updateImageShapePreview({
          backgroundCanvasRef,
          permanentStrokesCanvasRef,
          activeStrokeCanvasRef,
          previewCanvasRef,
          maskCanvasRef,
          tool: "inpaint",
          opacity: 1.0
        });
      }
      
      // Draw to active canvas for preview - use different approaches for inpaint vs brush/eraser
      if (tool === "inpaint") {
        // For inpaint tool, use simple circular shapes
        const dx = point.x - lastPoint.current.x;
        const dy = point.y - lastPoint.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.max(1, Math.floor(distance / (brushSize / 4)));
        
        for (let i = 0; i <= steps; i++) {
          const x = lastPoint.current.x + (dx * i / steps);
          const y = lastPoint.current.y + (dy * i / steps);
          
          drawInpaintDot(activeCtx, x, y, brushSize);
        }
      } else {
        // For brush/eraser, use brush textures
        drawBrushStroke(
          activeCtx,
          lastPoint.current,
          point,
          {
            size: brushSize,
            color: currentColor,
            hardness: brushHardness,
            rotation: brushRotation,
            followPath: brushFollowPath,
            spacing: brushSpacing
          },
          brushTexture as BrushTextureType,
          adaptedDrawMixboxStamp
        );
      }
      
      activeCtx.restore();
      
      updateImageShapePreview({
        backgroundCanvasRef,
        permanentStrokesCanvasRef,
        activeStrokeCanvasRef,
        previewCanvasRef,
        maskCanvasRef,
        tool,
        opacity: brushOpacity
      });
    }

    lastPoint.current = point;
  };

  const handlePointerUpOrLeave = () => {
    if (!isDrawing.current) return;

    const permanentCtx = getImageShapeCanvasContext(permanentStrokesCanvasRef);
    const activeCtx = getImageShapeCanvasContext(activeStrokeCanvasRef);
    
    if (!permanentCtx || !permanentStrokesCanvasRef.current || !activeStrokeCanvasRef.current || !activeCtx) return;

    if (tool === "eraser") {
      // Handle regular erasing (non-mask mode)
      if (activeStrokeCanvasRef.current && permanentStrokesCanvasRef.current) {
        const permanentCtx = getImageShapeCanvasContext(permanentStrokesCanvasRef);
        const activeCtx = getImageShapeCanvasContext(activeStrokeCanvasRef);
        
        if (activeCtx && permanentCtx) {
          // First apply opacity to active stroke
          activeCtx.save();
          activeCtx.globalAlpha = brushOpacity;
          activeCtx.drawImage(activeStrokeCanvasRef.current, 0, 0);
          activeCtx.restore();

          // Then apply eraser effect to permanent layer
          permanentCtx.save();
          permanentCtx.globalCompositeOperation = "destination-out";
          permanentCtx.drawImage(activeStrokeCanvasRef.current, 0, 0);
          permanentCtx.restore();
        }
      }

      // Clear active stroke
      clearImageShapeCanvas(activeStrokeCanvasRef);

      // Update preview with final state
      updateImageShapePreview({
        backgroundCanvasRef,
        permanentStrokesCanvasRef,
        activeStrokeCanvasRef,
        previewCanvasRef,
        maskCanvasRef,
        tool
      });
    } else if (tool === "inpaint") {
      // Handle mask mode erasing/inpainting
      if (maskCanvasRef && activeStrokeCanvasRef.current) {
        const maskCtx = getImageShapeCanvasContext(maskCanvasRef);
        if (maskCtx && maskCanvasRef.current) {
          const restoreMode = useStore.getState().inpaintRestoreMode;
          maskCtx.globalCompositeOperation = restoreMode ? "source-over" : "destination-out";
          maskCtx.globalAlpha = 1.0;
          maskCtx.drawImage(activeStrokeCanvasRef.current, 0, 0);
          
          // Ensure binary mask after update
          ensureBinaryMask(maskCanvasRef);
        }
      }

      // Clear active stroke before updating preview to prevent blinking
      clearImageShapeCanvas(activeStrokeCanvasRef);

      // Update preview with the mask changes
      updateImageShapePreview({
        backgroundCanvasRef,
        permanentStrokesCanvasRef,
        activeStrokeCanvasRef,
        previewCanvasRef,
        maskCanvasRef,
        tool,
        opacity: 1.0
      });
    } else {
      // For brush tool, transfer the active stroke to permanent layer
      permanentCtx.save();
      permanentCtx.globalCompositeOperation = "source-over";
      permanentCtx.globalAlpha = brushOpacity;
      
      // Ensure we maintain the original dimensions when transferring the stroke
      permanentCtx.drawImage(
        activeStrokeCanvasRef.current,
        0, 0, activeStrokeCanvasRef.current.width, activeStrokeCanvasRef.current.height,
        0, 0, permanentStrokesCanvasRef.current.width, permanentStrokesCanvasRef.current.height
      );
      permanentCtx.restore();

      // Clear active stroke after transferring to permanent layer
      clearImageShapeCanvas(activeStrokeCanvasRef);

      // Update preview with the stroke now in the permanent layer
      updateImageShapePreview({
        backgroundCanvasRef,
        permanentStrokesCanvasRef,
        activeStrokeCanvasRef,
        previewCanvasRef,
        maskCanvasRef,
        tool
      });
    }

    // Save the canvas data after the stroke is complete
    const shapeId = activeStrokeCanvasRef.current.dataset.shapeId;
    if (shapeId) {
      saveImageShapeState(
        {
          backgroundCanvasRef,
          permanentStrokesCanvasRef,
          activeStrokeCanvasRef,
          previewCanvasRef,
          maskCanvasRef
        },
        shapeId,
        useStore.getState().updateShape
      );
    }

    isDrawing.current = false;
    lastPoint.current = null;
  };

  const { drawMixboxStamp } = useMixboxBrush({
    backgroundCanvasRef,
    permanentStrokesCanvasRef,
    activeStrokeCanvasRef
  });

  const adaptedDrawMixboxStamp = adaptMixboxStamp(drawMixboxStamp);

  const drawBrushDot = (canvas: HTMLCanvasElement, point: Point) => {
    const ctx = getImageShapeCanvasContext({ current: canvas });
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = tool === "eraser" || tool === "inpaint" ? "destination-out" : "source-over";
    
    if (tool === "inpaint") {
      // Simple circular inpaint brush
      drawInpaintDot(ctx, point.x, point.y, brushSize);
    } else if (tool === "eraser") {
      // Simple circular eraser for single dots
      ctx.beginPath();
      ctx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 1)";
      ctx.fill();
    } else {
      // For brush, use the normal texture system
      drawBrushStamp(
        { ctx, x: point.x, y: point.y },
        {
          size: brushSize,
          color: currentColor,
          hardness: brushHardness,
          rotation: brushRotation,
          followPath: brushFollowPath
        },
        brushTexture as BrushTextureType,
        adaptedDrawMixboxStamp
      );
    }
    
    ctx.restore();
  };

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUpOrLeave,
  };
};
