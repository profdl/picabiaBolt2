import { useRef, useEffect } from "react";
import { useStore } from "../../../store";
import { useMixboxBrush } from "../../../hooks/ui/useMixbox";
import { 
  getImageShapeCanvasContext, 
  clearImageShapeCanvas, 
  getScaledPoint,
  updateImageShapePreview,
  saveImageShapeState,
  type ImageShapeCanvasRefs,
  type Point
} from "../../../utils/imageShapeCanvas";

const brushTextures = new Map<string, HTMLImageElement>();

interface BrushHandlers {
  handlePointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerUpOrLeave: () => void;
}

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

    // Clean up when tool changes away from brush/eraser
    if (!tool || (tool !== 'brush' && tool !== 'eraser')) {
      cleanup();
    }

    // Clean up on unmount
    return cleanup;
  }, [activeStrokeCanvasRef, backgroundCanvasRef, permanentStrokesCanvasRef, previewCanvasRef, maskCanvasRef, tool]);

  // Preload brush textures
  useEffect(() => {
    const BRUSH_TEXTURES = ["basic", "fur", "ink", "marker"];
    BRUSH_TEXTURES.forEach((texture) => {
      if (!brushTextures.has(texture)) {
        const img = new Image();
        img.src = `/brushes/${texture}.png`;
        img.onload = () => {
          brushTextures.set(texture, img);
        };
      }
    });
  }, []);

  const applyBrushTexture = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    size: number
  ) => {
    // Create a temporary canvas for the brush stamp
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) return;

    // Draw the color using mixbox - use full opacity for the stamp
    drawMixboxStamp({
      ctx: tempCtx,
      x: size / 2,
      y: size / 2,
      color,
      opacity: 1, // Always use full opacity for individual stamps
      size
    });

    if (brushTexture === 'soft') {
      // For soft brush, use a radial gradient as the mask
      const gradient = tempCtx.createRadialGradient(
        size / 2, size / 2, 0,
        size / 2, size / 2, size / 2
      );
      
      const hardnessFactor = 1 - Math.max(0.01, brushHardness);
      
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(Math.min(1, 1 - hardnessFactor), 'rgba(255,255,255,0.5)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      
      // Apply the gradient mask
      tempCtx.globalCompositeOperation = 'destination-in';
      tempCtx.fillStyle = gradient;
      tempCtx.fillRect(0, 0, size, size);
    } else {
      // For other brushes, use the texture image as mask
      const textureImg = brushTextures.get(brushTexture);
      if (textureImg && textureImg.complete) {
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(textureImg, 0, 0, size, size);
      }
    }

    // Draw the final result
    ctx.drawImage(tempCanvas, x - size / 2, y - size / 2);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== "brush" && tool !== "eraser") return;
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
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPoint.current) return;
    if (tool !== "brush" && tool !== "eraser") return;

    const point = getScaledPoint(e);
    if (!point) return;

    const dx = point.x - lastPoint.current.x;
    const dy = point.y - lastPoint.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    accumulatedDistance.current += distance;

    const spacing = Math.max(brushSize * brushSpacing, 1);
    if (accumulatedDistance.current >= spacing) {
      const activeCtx = getImageShapeCanvasContext(activeStrokeCanvasRef);
      if (activeCtx && lastPoint.current) {
        activeCtx.save();
        activeCtx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
        
        if (tool === "eraser") {
          // For eraser, draw to both active and mask canvases
          if (maskCanvasRef) {
            const maskCtx = getImageShapeCanvasContext(maskCanvasRef);
            if (maskCtx && maskCanvasRef.current) {
              maskCtx.save();
              maskCtx.globalCompositeOperation = "destination-out";
              maskCtx.globalAlpha = brushOpacity;
              drawBrushStroke(maskCtx, lastPoint.current, point);
              maskCtx.restore();
            }
          }
        }
        
        // Draw to active canvas for preview
        drawBrushStroke(activeCtx, lastPoint.current, point);
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
      accumulatedDistance.current = 0;
    }

    lastPoint.current = point;
  };

  const handlePointerUpOrLeave = () => {
    if (!isDrawing.current) return;

    const permanentCtx = getImageShapeCanvasContext(permanentStrokesCanvasRef);
    
    if (!permanentCtx || !permanentStrokesCanvasRef.current || !activeStrokeCanvasRef.current) return;

    if (tool === "eraser") {
      // Handle eraser with mask
      if (maskCanvasRef) {
        const maskCtx = getImageShapeCanvasContext(maskCanvasRef);
        if (maskCtx && maskCanvasRef.current) {
          maskCtx.globalCompositeOperation = "destination-out";
          maskCtx.drawImage(activeStrokeCanvasRef.current, 0, 0);
        }
      }
    } else {
      // Create temporary canvas for opacity handling
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = activeStrokeCanvasRef.current.width;
      tempCanvas.height = activeStrokeCanvasRef.current.height;
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      
      if (tempCtx) {
        // Apply opacity to stroke on temp canvas
        tempCtx.globalAlpha = brushOpacity;
        tempCtx.drawImage(activeStrokeCanvasRef.current, 0, 0);
        
        // Draw to permanent canvas at full opacity
        permanentCtx.globalAlpha = 1;
        permanentCtx.globalCompositeOperation = "source-over";
        permanentCtx.drawImage(tempCanvas, 0, 0);
      }
    }

    // Clear active stroke
    clearImageShapeCanvas(activeStrokeCanvasRef);

    // Update preview with all layers
    updateImageShapePreview({
      backgroundCanvasRef,
      permanentStrokesCanvasRef,
      activeStrokeCanvasRef,
      previewCanvasRef,
      maskCanvasRef,
      tool
    });

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

  const drawBrushDot = (canvas: HTMLCanvasElement, point: Point) => {
    const ctx = getImageShapeCanvasContext({ current: canvas });
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    
    if (tool === "eraser") {
      // Simple circular eraser
      ctx.beginPath();
      ctx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 1)";
      ctx.fill();
    } else {
      // For brush, use the normal texture system
      applyBrushTexture(ctx, point.x, point.y, currentColor, brushSize);
    }
    
    ctx.restore();
  };

  const drawBrushStroke = (
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point
  ) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const spacing = Math.max(brushSize * brushSpacing, 1);
    const steps = Math.ceil(distance / spacing);
    const pathAngle = Math.atan2(dy, dx);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = start.x + dx * t;
      const y = start.y + dy * t;

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.translate(x, y);

      const rotation = brushFollowPath
        ? pathAngle
        : (brushRotation * Math.PI) / 180;

      ctx.rotate(rotation);
      applyBrushTexture(
        ctx, 
        0, 
        0, 
        currentColor, 
        brushSize
      );
      ctx.restore();
    }
  };

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUpOrLeave,
  };
};
