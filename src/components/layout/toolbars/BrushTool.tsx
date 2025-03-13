import { useRef, useEffect } from "react";
import { useStore } from "../../../store";
import { useMixboxBrush } from "../../../hooks/ui/useMixbox";
const brushTextures = new Map<string, HTMLImageElement>();

interface Point {
  x: number;
  y: number;
  angle?: number;
}

const useBrush = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  const isDrawing = useRef(false);
  const lastPoint = useRef<Point | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const accumulatedDistance = useRef(0); // Accumulates distance between points
  const {
    brushFollowPath,
    currentColor,
    brushSize,
    brushOpacity,
    tool,
    brushTexture,
    brushSpacing,
    brushRotation,
    brushHardness,
  } = useStore();

  useEffect(() => {
    if (!canvasRef.current) return;
  
    // Initialize overlay canvas
    overlayCanvasRef.current = document.createElement("canvas");
    overlayCanvasRef.current.width = 512;
    overlayCanvasRef.current.height = 512;
    overlayCanvasRef.current.getContext('2d', { willReadFrequently: true });
  
    // Initialize stroke canvas
    strokeCanvasRef.current = document.createElement("canvas");
    strokeCanvasRef.current.width = 512;
    strokeCanvasRef.current.height = 512;
  
    // Initialize with black background
    const strokeCtx = strokeCanvasRef.current.getContext("2d", { willReadFrequently: true });
    if (strokeCtx) {
      strokeCtx.fillStyle = "#000000";
      strokeCtx.fillRect(0, 0, 512, 512);
    }

    // Preload brush textures
    const BRUSH_TEXTURES = ["basic", "fur", "ink", "marker"];
    BRUSH_TEXTURES.forEach((texture) => {
      const img = new Image();
      img.src = `/brushes/${texture}.png`;
      img.onload = () => {
        brushTextures.set(texture, img);
      };
      img.onerror = () => {
        console.error(`Failed to load texture: ${texture}`);
      };
    });
  }, [canvasRef]);

  const getScaledPoint = (
    e: React.PointerEvent<HTMLCanvasElement>
  ): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== "brush" && tool !== "eraser") return;
    e.preventDefault();

    const point = getScaledPoint(e);
    if (!point) return;

    isDrawing.current = true;
    lastPoint.current = point;

    // Clear overlay canvas at the start of a new stroke
    const overlayCtx = overlayCanvasRef.current?.getContext("2d");
    if (overlayCtx) {
      overlayCtx.clearRect(0, 0, 512, 512);
    }

    // Draw initial dot
    drawBrushDot(overlayCanvasRef.current!, point);

    // Update display
    updateMainCanvas();
  };

  // // Handle pointer move
  // const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
  //   if (!isDrawing.current || !lastPoint.current) return;
  //   if (tool !== "brush" && tool !== "eraser") return;
  //   e.preventDefault();

  //   const point = getScaledPoint(e);
  //   if (!point) return;

  //   const dx = point.x - lastPoint.current.x;
  //   const dy = point.y - lastPoint.current.y;
  //   const distance = Math.sqrt(dx * dx + dy * dy);
  //   accumulatedDistance.current += distance;

  //   // Determine the number of stamps needed based on accumulated distance and brush spacing
  //   const spacing = Math.max(brushSize * brushSpacing, 1);
  //   if (accumulatedDistance.current >= spacing) {
  //     // Draw the stroke segment directly onto the overlay canvas
  //     const overlayCtx = overlayCanvasRef.current?.getContext("2d");
  //     if (overlayCtx && lastPoint.current) {
  //       // Draw stamps along the accumulated distance path
  //       drawBrushStroke(
  //         overlayCtx,
  //         lastPoint.current,
  //         point,
  //         accumulatedDistance.current
  //       );
  //     }

  //     // Reset accumulated distance after drawing
  //     accumulatedDistance.current = 0;
  //   }

  //   // Update main canvas display
  //   updateMainCanvas();

  //   lastPoint.current = point;
  // };

  const handlePointerUpOrLeave = () => {
    if (!isDrawing.current) return;

    // Merge the complete stroke from overlay to stroke canvas
    const strokeCtx = strokeCanvasRef.current?.getContext("2d");
    if (strokeCtx && overlayCanvasRef.current) {
      strokeCtx.save();
      strokeCtx.globalAlpha = brushOpacity;
      strokeCtx.drawImage(overlayCanvasRef.current, 0, 0);
      strokeCtx.restore();
    }

    // Clear the overlay canvas
    const overlayCtx = overlayCanvasRef.current?.getContext("2d");
    if (overlayCtx) {
      overlayCtx.clearRect(0, 0, 512, 512);
    }

    // Final update to main canvas
    updateMainCanvas();

    isDrawing.current = false;
    lastPoint.current = null;

    // Save the canvas data after the stroke is complete
    if (canvasRef.current) {
      const canvasData = canvasRef.current.toDataURL("image/png");
      useStore
        .getState()
        .updateShape(canvasRef.current.dataset.shapeId!, { canvasData });
    }
  };
  const updateMainCanvas = () => {
    const ctx = canvasRef.current?.getContext("2d", { willReadFrequently: true });
    if (!ctx || !strokeCanvasRef.current || !overlayCanvasRef.current) return;

    // Clear main canvas
    ctx.clearRect(0, 0, 512, 512);

    // Draw black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 512, 512);

    // Draw completed strokes
    ctx.drawImage(strokeCanvasRef.current, 0, 0);

    // Draw curre nt stroke with opacity
    ctx.save();
    ctx.globalAlpha = brushOpacity;
    ctx.drawImage(overlayCanvasRef.current, 0, 0);
    ctx.restore();
  };

  const drawBrushDot = (canvas: HTMLCanvasElement, point: Point) => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const textureImg = brushTextures.get(brushTexture);
    if (!ctx) return;
  
    ctx.save();
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
  
      // Apply rotation transformation
      ctx.translate(point.x, point.y);
      ctx.rotate((brushRotation * Math.PI) / 180);
      ctx.translate(-brushSize / 2, -brushSize / 2);
  
      if (brushTexture === 'soft') {
        // Reset transformation for radial gradient
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        const gradient = ctx.createRadialGradient(
          point.x, point.y, 0,
          point.x, point.y, brushSize / 2
        );
        
        const alpha = brushOpacity;
        const hardnessFactor = 1 - Math.max(0.01, brushHardness);
        
        gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
        gradient.addColorStop(Math.min(1, 1 - hardnessFactor), `rgba(255,255,255,${alpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (textureImg && textureImg.complete) {
        // Use drawMixboxStamp for the initial dot to maintain consistency
        drawMixboxStamp({
          ctx,
          x: brushSize / 2,
          y: brushSize / 2,
          color: currentColor,
          opacity: brushOpacity,
          size: brushSize
        });
  
        // Apply texture after the mixbox stamp
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = brushSize;
        tempCanvas.height = brushSize;
        const tempCtx = tempCanvas.getContext("2d");
        if (tempCtx) {
          // Copy the mixbox result
          tempCtx.drawImage(canvas, point.x - brushSize/2, point.y - brushSize/2, brushSize, brushSize, 0, 0, brushSize, brushSize);
          
          // Apply texture as mask
          tempCtx.globalCompositeOperation = "destination-in";
          tempCtx.drawImage(textureImg, 0, 0, brushSize, brushSize);
  
          // Clear original area and draw the textured result
          ctx.clearRect(0, 0, brushSize, brushSize);
          ctx.drawImage(tempCanvas, 0, 0);
        }
      }
    }
    ctx.restore();
  };
  
  const drawBrushStamp = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number
  ) => {
    const textureImg = brushTextures.get(brushTexture);
  
    if (brushTexture === 'soft') {
      const gradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, brushSize / 2
      );
      
      const alpha = brushOpacity;
      const hardnessFactor = 1 - Math.max(0.01, brushHardness);
      
      gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
      gradient.addColorStop(Math.min(1, 1 - hardnessFactor), `rgba(255,255,255,${alpha * 0.5})`);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (textureImg && textureImg.complete) {
      // Create temporary canvas for colored texture
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = brushSize;
      tempCanvas.height = brushSize;
      const tempCtx = tempCanvas.getContext('2d');
  
      if (tempCtx) {
        // Draw mixed color using Mixbox
        drawMixboxStamp({
          ctx: tempCtx,
          x: brushSize / 2,
          y: brushSize / 2,
          color: currentColor,
          opacity: brushOpacity,
          size: brushSize
        });
  
        // Apply texture
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(textureImg, 0, 0, brushSize, brushSize);
  
        // Draw the final result
        ctx.drawImage(tempCanvas, x - brushSize/2, y - brushSize/2);
      }
    }
  };

  const { drawMixboxStamp } = useMixboxBrush({
    canvasRef,
    strokeCanvasRef,
    overlayCanvasRef
  });


  const drawBrushStroke = (
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point
  ) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const spacing = Math.max(brushSize * brushSpacing, 1);
    const pathAngle = Math.atan2(dy, dx);
    const steps = Math.ceil(distance / spacing);
  
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = start.x + dx * t;
      const y = start.y + dy * t;
  
      if (brushTexture === 'soft') {
        const gradient = ctx.createRadialGradient(
          x, y, 0,
          x, y, brushSize / 2
        );
        
        const alpha = brushOpacity;
        const hardnessFactor = 1 - Math.max(0.01, brushHardness);
        
        gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
        gradient.addColorStop(Math.min(1, 1 - hardnessFactor), `rgba(255,255,255,${alpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(x, y);
  
        const rotation = brushFollowPath
          ? pathAngle
          : (brushRotation * Math.PI) / 180;
  
        ctx.rotate(rotation);
        ctx.translate(-brushSize / 2, -brushSize / 2);
  
        drawBrushStamp(ctx, brushSize / 2, brushSize / 2);
        ctx.restore();
      }
    }
  };
  
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPoint.current) return;
    if (tool !== "brush" && tool !== "eraser") return;
    e.preventDefault();
  
    const point = getScaledPoint(e);
    if (!point) return;
  
    const dx = point.x - lastPoint.current.x;
    const dy = point.y - lastPoint.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    accumulatedDistance.current += distance;
  
    const spacing = Math.max(brushSize * brushSpacing, 1);
    if (accumulatedDistance.current >= spacing) {
      const overlayCtx = overlayCanvasRef.current?.getContext("2d");
      if (overlayCtx && lastPoint.current) {
        if (tool === "eraser") {
          overlayCtx.globalCompositeOperation = "destination-out";
        } else {
          overlayCtx.globalCompositeOperation = "source-over";
        }
        
        drawBrushStroke(
          overlayCtx,
          lastPoint.current,
          point
        );
      }
      accumulatedDistance.current = 0;
    }
  
    updateMainCanvas();
    lastPoint.current = point;
  };

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUpOrLeave,
  };
};

export { useBrush };
