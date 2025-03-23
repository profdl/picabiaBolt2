import { useRef, useEffect } from "react";
import { useStore } from "../../../store";
import { useMixboxBrush } from "../../../hooks/ui/useMixbox";

const brushTextures = new Map<string, HTMLImageElement>();

interface Point {
  x: number;
  y: number;
  angle?: number;
}

interface Stroke {
  color: string;
  width: number;
  points: Point[];
}

interface BrushProps {
  backgroundCanvasRef: React.RefObject<HTMLCanvasElement>;
  permanentStrokesCanvasRef: React.RefObject<HTMLCanvasElement>;
  activeStrokeCanvasRef: React.RefObject<HTMLCanvasElement>;
  previewCanvasRef: React.RefObject<HTMLCanvasElement>;
  maskCanvasRef?: React.RefObject<HTMLCanvasElement>;
}

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
}: BrushProps): BrushHandlers => {
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
        const activeCtx = activeStrokeCanvasRef.current.getContext("2d", { willReadFrequently: true });
        if (activeCtx) {
          activeCtx.clearRect(
            0, 
            0, 
            activeStrokeCanvasRef.current.width, 
            activeStrokeCanvasRef.current.height
          );
        }
      }

      // Update preview if it exists
      if (previewCanvasRef.current) {
        const previewCtx = previewCanvasRef.current.getContext("2d", { willReadFrequently: true });
        if (previewCtx) {
          previewCtx.clearRect(
            0,
            0,
            previewCanvasRef.current.width,
            previewCanvasRef.current.height
          );
          if (backgroundCanvasRef.current) {
            previewCtx.drawImage(backgroundCanvasRef.current, 0, 0);
          }
          if (permanentStrokesCanvasRef.current) {
            previewCtx.drawImage(permanentStrokesCanvasRef.current, 0, 0);
          }
        }
      }
    };

    // Clean up when tool changes away from brush/eraser
    if (!tool || (tool !== 'brush' && tool !== 'eraser')) {
      cleanup();
    }

    // Clean up on unmount
    return cleanup;
  }, [activeStrokeCanvasRef, backgroundCanvasRef, permanentStrokesCanvasRef, previewCanvasRef, tool]);

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

  const getScaledPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point | null => {
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

  const updatePreview = () => {
    const previewCtx = previewCanvasRef.current?.getContext("2d", { willReadFrequently: true });
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
        tempCtx.globalAlpha = brushOpacity;
        tempCtx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
        tempCtx.drawImage(activeStrokeCanvasRef.current, 0, 0);
        
        // Draw temp canvas (with opacity) onto preview
        previewCtx.globalAlpha = 1; // Keep preview at full opacity
        previewCtx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
        previewCtx.drawImage(tempCanvas, 0, 0);
    }

    // Update the mask image on the preview canvas
    if (previewCanvasRef.current && maskCanvasRef && maskCanvasRef.current) {
        previewCanvasRef.current.style.webkitMaskImage = `url(${maskCanvasRef.current.toDataURL()})`;
        previewCanvasRef.current.style.maskImage = `url(${maskCanvasRef.current.toDataURL()})`;
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== "brush" && tool !== "eraser") return;
    const point = getScaledPoint(e);
    if (!point) return;

    isDrawing.current = true;
    lastPoint.current = point;

    // Clear active stroke canvas at the start of a new stroke
    const activeCtx = activeStrokeCanvasRef.current?.getContext("2d", { willReadFrequently: true });
    if (activeCtx && activeStrokeCanvasRef.current) {
      // Clear both active and preview canvases
      activeCtx.clearRect(0, 0, activeStrokeCanvasRef.current.width, activeStrokeCanvasRef.current.height);
      
      // Draw the initial dot at full opacity on active canvas
      drawBrushDot(activeStrokeCanvasRef.current, point);
      
      // Update preview with proper opacity
      updatePreview();
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
      const activeCtx = activeStrokeCanvasRef.current?.getContext("2d", { willReadFrequently: true });
      if (activeCtx && lastPoint.current) {
        activeCtx.save();
        activeCtx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
        
        if (tool === "eraser") {
          // For eraser, draw to both active and mask canvases
          const maskCtx = maskCanvasRef?.current?.getContext("2d", { willReadFrequently: true });
          if (maskCtx && maskCanvasRef && maskCanvasRef.current) {
            maskCtx.save();
            maskCtx.globalCompositeOperation = "destination-out";
            maskCtx.globalAlpha = brushOpacity;
            drawBrushStroke(maskCtx, lastPoint.current, point);
            maskCtx.restore();
          }
        }
        
        // Draw to active canvas for preview
        drawBrushStroke(activeCtx, lastPoint.current, point);
        activeCtx.restore();
        
        updatePreview();
      }
      accumulatedDistance.current = 0;
    }

    lastPoint.current = point;
  };

  const handlePointerUpOrLeave = () => {
    if (!isDrawing.current) return;

    const permanentCtx = permanentStrokesCanvasRef.current?.getContext("2d", { willReadFrequently: true });
    
    if (!permanentCtx || !permanentStrokesCanvasRef.current || !activeStrokeCanvasRef.current) return;

    if (tool === "eraser") {
        // Handle eraser with mask
        const maskCtx = maskCanvasRef?.current?.getContext("2d", { willReadFrequently: true });
        if (maskCtx && maskCanvasRef?.current) {
            maskCtx.globalCompositeOperation = "destination-out";
            maskCtx.drawImage(activeStrokeCanvasRef.current, 0, 0);
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
    const activeCtx = activeStrokeCanvasRef.current.getContext("2d", { willReadFrequently: true });
    if (activeCtx) {
        activeCtx.clearRect(0, 0, activeStrokeCanvasRef.current.width, activeStrokeCanvasRef.current.height);
    }

    // Update preview with all layers
    const previewCtx = previewCanvasRef.current?.getContext("2d", { willReadFrequently: true });
    if (previewCtx && previewCanvasRef.current) {
        previewCtx.save();
        
        // Clear preview
        previewCtx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
        
        // Draw background
        if (backgroundCanvasRef.current) {
            previewCtx.drawImage(backgroundCanvasRef.current, 0, 0);
        }
        
        // Draw permanent strokes
        previewCtx.drawImage(permanentStrokesCanvasRef.current, 0, 0);
        
        // Apply mask if it exists
        if (maskCanvasRef?.current) {
            previewCtx.globalCompositeOperation = "destination-in";
            previewCtx.drawImage(maskCanvasRef.current, 0, 0);
        }
        
        previewCtx.restore();

        // Update the mask image on the preview canvas
        if (previewCanvasRef.current && maskCanvasRef?.current) {
            previewCanvasRef.current.style.webkitMaskImage = `url(${maskCanvasRef.current.toDataURL()})`;
            previewCanvasRef.current.style.maskImage = `url(${maskCanvasRef.current.toDataURL()})`;
        }
    }

    // Save the stroke data after the stroke is complete
    const shapeId = activeStrokeCanvasRef.current.dataset.shapeId;
    if (shapeId) {
        // Get the current stroke data from the shape
        const currentStrokeData = useStore.getState().shapes.find(s => s.id === shapeId)?.permanentCanvasData;
        let strokes: Stroke[] = [];
        
        try {
            if (currentStrokeData) {
                strokes = JSON.parse(currentStrokeData);
            }
        } catch (e) {
            console.warn('Error parsing current stroke data:', e);
        }

        // Add the new stroke data with optimized points
        if (lastPoint.current) {
            // Only save the start and end points of the stroke
            const newStroke: Stroke = {
                color: currentColor,
                width: brushSize,
                points: [lastPoint.current]
            };
            strokes.push(newStroke);
        }

        // Limit the total number of strokes to prevent excessive storage
        const MAX_STROKES = 50;
        if (strokes.length > MAX_STROKES) {
            strokes = strokes.slice(-MAX_STROKES);
        }

        // Save the updated stroke data
        useStore.getState().updateShape(shapeId, { 
            permanentCanvasData: JSON.stringify(strokes)
        });
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
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
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
