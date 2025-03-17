import { useRef, useEffect } from "react";
import { useStore } from "../../../store";
import { useMixboxBrush } from "../../../hooks/ui/useMixbox";

const brushTextures = new Map<string, HTMLImageElement>();

interface Point {
  x: number;
  y: number;
  angle?: number;
}

interface BrushProps {
  backgroundCanvasRef: React.RefObject<HTMLCanvasElement>;
  permanentStrokesCanvasRef: React.RefObject<HTMLCanvasElement>;
  activeStrokeCanvasRef: React.RefObject<HTMLCanvasElement>;
  previewCanvasRef: React.RefObject<HTMLCanvasElement>;
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
  previewCanvasRef
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

    // Clear the preview canvas
    previewCtx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);

    // Draw background image first
    if (backgroundCanvasRef.current) {
      previewCtx.drawImage(backgroundCanvasRef.current, 0, 0);
    }

    // Draw permanent strokes at full opacity
    if (permanentStrokesCanvasRef.current) {
      previewCtx.drawImage(permanentStrokesCanvasRef.current, 0, 0);
    }

    // Draw active stroke with current opacity
    if (activeStrokeCanvasRef.current) {
      previewCtx.save();
      if (tool === "eraser") {
        previewCtx.globalCompositeOperation = "destination-out";
      } else {
        previewCtx.globalCompositeOperation = "source-over";
      }
      previewCtx.globalAlpha = brushOpacity;
      previewCtx.drawImage(activeStrokeCanvasRef.current, 0, 0);
      previewCtx.restore();
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
        // Draw stroke at full opacity on active canvas
        if (tool === "eraser") {
          activeCtx.globalCompositeOperation = "destination-out";
        } else {
          activeCtx.globalCompositeOperation = "source-over";
        }
        
        drawBrushStroke(
          activeCtx,
          lastPoint.current,
          point
        );

        // Update preview with proper opacity
        updatePreview();
      }
      accumulatedDistance.current = 0;
    }

    lastPoint.current = point;
  };

  const handlePointerUpOrLeave = () => {
    if (!isDrawing.current) return;

    // Get the permanent strokes canvas context
    const permanentCtx = permanentStrokesCanvasRef.current?.getContext("2d", { willReadFrequently: true });
    if (!permanentCtx || !permanentStrokesCanvasRef.current || !activeStrokeCanvasRef.current) return;

    // Merge the active stroke onto the permanent strokes canvas
    permanentCtx.save();
    if (tool === "eraser") {
      permanentCtx.globalCompositeOperation = "destination-out";
    } else {
      permanentCtx.globalCompositeOperation = "source-over";
    }
    permanentCtx.globalAlpha = brushOpacity;
    permanentCtx.drawImage(activeStrokeCanvasRef.current, 0, 0);
    permanentCtx.restore();

    // Clear the active stroke canvas
    const activeCtx = activeStrokeCanvasRef.current.getContext("2d", { willReadFrequently: true });
    if (activeCtx) {
      activeCtx.clearRect(0, 0, activeStrokeCanvasRef.current.width, activeStrokeCanvasRef.current.height);
    }

    // Update preview to show only permanent strokes
    updatePreview();

    // Save the canvas data after the stroke is complete
    const shapeId = activeStrokeCanvasRef.current.dataset.shapeId;
    if (shapeId) {
      const canvasData = permanentStrokesCanvasRef.current.toDataURL("image/png");
      useStore.getState().updateShape(shapeId, { canvasData });
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
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      const radius = brushSize / 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = "source-over";
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
      if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        const radius = brushSize / 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
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
      }
      ctx.restore();
    }
  };

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUpOrLeave,
  };
};
