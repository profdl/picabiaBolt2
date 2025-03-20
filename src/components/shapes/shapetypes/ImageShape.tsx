import { useEffect, useRef } from "react";
import { useStore } from "../../../store";
import { Shape } from "../../../types";
import { supabase } from "../../../lib/supabase";
import { ImageEditor } from "./ImageEditor";
import { useBrush } from "../../layout/toolbars/BrushTool";

interface ImageShapeProps {
  shape: Shape;
  tool: "select" | "pan" | "pen" | "brush" | "eraser";
  handleContextMenu: (e: React.MouseEvent) => void;
}

interface PreprocessedImagePayload {
  new: {
    status: string;
    processType: string;
    shapeId: string;
    [key: string]: string | number | boolean | null;
  };
}

export const ImageShape: React.FC<ImageShapeProps> = ({ shape, tool, handleContextMenu }) => {
  const updateShape = useStore((state) => state.updateShape);
  
  // Create refs for our canvas layers
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const permanentStrokesCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeStrokeCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const redBackgroundCanvasRef = useRef<HTMLCanvasElement>(null);

  // Add isDrawing ref to track drawing state
  const isDrawing = useRef(false);

  // Store the initial mask dimensions
  const maskDimensionsRef = useRef<{ width: number; height: number; gradient: CanvasGradient | null }>({
    width: 0,
    height: 0,
    gradient: null
  });

  // Function to reapply mask with original dimensions
  const reapplyMask = () => {
    const maskCanvas = maskCanvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (!maskCanvas || !previewCanvas) return;

    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!maskCtx) return;

    // When using eraser, we don't want to reset the mask
    if (tool !== 'eraser') {
      // Ensure mask canvas maintains original dimensions
      maskCanvas.width = maskDimensionsRef.current.width;
      maskCanvas.height = maskDimensionsRef.current.height;

      // Clear and fill mask with white
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      maskCtx.fillStyle = 'white';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    }

    // Apply mask using CSS properties with proper scaling
    const maskDataUrl = maskCanvas.toDataURL();
    previewCanvas.style.webkitMaskImage = `url(${maskDataUrl})`;
    previewCanvas.style.maskImage = `url(${maskDataUrl})`;
    previewCanvas.style.webkitMaskSize = 'cover';
    previewCanvas.style.maskSize = 'cover';
    previewCanvas.style.webkitMaskPosition = 'center';
    previewCanvas.style.maskPosition = 'center';
  };

  // Function to handle eraser strokes on mask
  const handleEraserStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const maskCanvas = maskCanvasRef.current;
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
  };

  // Modify brush handlers to use reapplyMask
  const { handlePointerDown: originalHandlePointerDown, handlePointerMove: originalHandlePointerMove, handlePointerUpOrLeave: originalHandlePointerUpOrLeave } = useBrush({
    backgroundCanvasRef,
    permanentStrokesCanvasRef,
    activeStrokeCanvasRef,
    previewCanvasRef,
    maskCanvasRef
  });

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    if (tool === 'eraser') {
      handleEraserStroke(e);
    } else {
      originalHandlePointerDown(e);
      reapplyMask();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    
    if (tool === 'eraser') {
      handleEraserStroke(e);
    } else {
      originalHandlePointerMove(e);
      if (isDrawing.current) {
        reapplyMask();
      }
    }
  };

  const handlePointerUpOrLeave = () => {
    isDrawing.current = false;
    if (tool !== 'eraser') {
      originalHandlePointerUpOrLeave();
      reapplyMask();
    }
  };

  const subscriptionRef = useRef<{
    [key: string]: ReturnType<typeof supabase.channel>;
  }>({});

  const generateNoise = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Random noise value
      const noise = Math.random() * 255;
      
      // Set RGB values - using red with some variation
      data[i] = noise;     // Red channel
      data[i + 1] = 0;     // Green channel
      data[i + 2] = 0;     // Blue channel
      data[i + 3] = 50;    // Alpha channel (very transparent)
    }
    
    return imageData;
  };

  // Initialize canvases with image
  useEffect(() => {
    console.log('ImageShape initialization started:', {
      hasImageUrl: !!shape.imageUrl,
      canvasRefs: {
        background: !!backgroundCanvasRef.current,
        permanent: !!permanentStrokesCanvasRef.current,
        active: !!activeStrokeCanvasRef.current,
        preview: !!previewCanvasRef.current,
        mask: !!maskCanvasRef.current,
        redBackground: !!redBackgroundCanvasRef.current
      }
    });

    if (!backgroundCanvasRef.current || !permanentStrokesCanvasRef.current || 
        !activeStrokeCanvasRef.current || !previewCanvasRef.current || 
        !maskCanvasRef.current || !redBackgroundCanvasRef.current || !shape.imageUrl) return;

    const backgroundCanvas = backgroundCanvasRef.current;
    const permanentCanvas = permanentStrokesCanvasRef.current;
    const activeCanvas = activeStrokeCanvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const redBackgroundCanvas = redBackgroundCanvasRef.current;
    
    const bgCtx = backgroundCanvas.getContext('2d', { willReadFrequently: true });
    const permanentCtx = permanentCanvas.getContext('2d', { willReadFrequently: true });
    const activeCtx = activeCanvas.getContext('2d', { willReadFrequently: true });
    const previewCtx = previewCanvas.getContext('2d', { willReadFrequently: true });
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    const redBgCtx = redBackgroundCanvas.getContext('2d', { willReadFrequently: true });
    
    if (!bgCtx || !permanentCtx || !activeCtx || !previewCtx || !maskCtx || !redBgCtx) return;

    // Clear all canvases first
    [backgroundCanvas, permanentCanvas, activeCanvas, previewCanvas, maskCanvas, redBackgroundCanvas].forEach(canvas => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    // Load and draw the image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      console.log('Image loaded:', {
        originalWidth: img.width,
        originalHeight: img.height
      });

      // Set canvas dimensions to match the image's aspect ratio
      const aspectRatio = img.width / img.height;
      const width = 512;
      const height = 512 / aspectRatio;

      console.log('Setting canvas dimensions:', {
        width,
        height,
        aspectRatio
      });

      // Set dimensions for all canvases
      [backgroundCanvas, permanentCanvas, activeCanvas, previewCanvas, maskCanvas, redBackgroundCanvas].forEach(canvas => {
        canvas.width = width;
        canvas.height = height;
      });

      // Fill red background canvas with noise
      const noisePattern = generateNoise(redBgCtx, width, height);
      redBgCtx.putImageData(noisePattern, 0, 0);

      // Draw image on background canvas
      if (!bgCtx || !previewCtx || !permanentCtx || !maskCtx) return;

      bgCtx.drawImage(img, 0, 0, width, height);
      console.log('Background canvas drawn');

      // Create and apply the mask
      maskCtx.clearRect(0, 0, width, height);
      
      // Fill mask with white to make image fully visible initially
      maskCtx.fillStyle = 'white';
      maskCtx.fillRect(0, 0, width, height);
      
      // Store the initial dimensions (without gradient)
      maskDimensionsRef.current = {
        width,
        height,
        gradient: null
      };
      
      console.log('Mask canvas drawn');

      // Clear preview canvas
      previewCtx.clearRect(0, 0, width, height);
      
      // Draw the background image to preview canvas
      previewCtx.save();
      previewCtx.drawImage(backgroundCanvas, 0, 0);
      previewCtx.restore();
      
      // Apply the initial mask using CSS
      const maskDataUrl = maskCanvas.toDataURL();
      previewCanvas.style.webkitMaskImage = `url(${maskDataUrl})`;
      previewCanvas.style.maskImage = `url(${maskDataUrl})`;
      previewCanvas.style.webkitMaskSize = 'cover';
      previewCanvas.style.maskSize = 'cover';
      previewCanvas.style.webkitMaskPosition = 'center';
      previewCanvas.style.maskPosition = 'center';
      console.log('Preview canvas: background drawn and masked');
    };
    img.src = shape.imageUrl;
  }, [shape.imageUrl, updateShape, shape.id, shape.canvasData, shape.isImageEditing]);

  // Handle clearing strokes
  const handleClear = () => {
    if (!permanentStrokesCanvasRef.current || !previewCanvasRef.current) return;
    const ctx = permanentStrokesCanvasRef.current.getContext('2d', { willReadFrequently: true });
    const previewCtx = previewCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx || !previewCtx) return;
    
    ctx.clearRect(0, 0, permanentStrokesCanvasRef.current.width, permanentStrokesCanvasRef.current.height);
    previewCtx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
    
    // When clearing strokes, set canvasData to undefined
    updateShape(shape.id, { canvasData: undefined });
  };

  // Set up subscriptions for each process type
  useEffect(() => {
    const processTypes = ["depth", "edge", "pose", "sketch"];

    processTypes.forEach((processType) => {
      if (shape[`show${processType.charAt(0).toUpperCase() + processType.slice(1)}` as keyof Shape]) {
        const channelName = `preprocessing_${shape.id}_${processType}`;

        if (!subscriptionRef.current[channelName]) {
          const subscription = supabase
            .channel(channelName)
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table: "preprocessed_images",
                filter: `shapeId=eq.${shape.id}`,
              },
              (payload: PreprocessedImagePayload) => {
                if (
                  payload.new.status === "completed" &&
                  payload.new.processType === processType
                ) {
                  const urlKey = `${processType}Url`;
                  const previewUrlKey = `${processType}PreviewUrl`;

                  updateShape(shape.id, {
                    [previewUrlKey]: payload.new[urlKey],
                  });
                }
              }
            )
            .subscribe();

          subscriptionRef.current[channelName] = subscription;
        }
      }
    });

    return () => {
      Object.values(subscriptionRef.current).forEach((subscription) => {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
      });
      subscriptionRef.current = {};
    };
  }, [shape, updateShape]);

  return (
    <div className="relative w-full h-full">
      {shape.isImageEditing ? (
        <ImageEditor shape={shape} updateShape={updateShape} />
      ) : (
        <>
          <canvas
            ref={redBackgroundCanvasRef}
            className="absolute w-full h-full object-cover"
            style={{
              touchAction: "none",
              pointerEvents: "none",
              visibility: "visible",
              zIndex: 0
            }}
          />
          <canvas
            ref={backgroundCanvasRef}
            className="absolute w-full h-full object-cover"
            style={{
              touchAction: "none",
              pointerEvents: "none",
              visibility: "hidden"
            }}
          />
          <canvas
            ref={permanentStrokesCanvasRef}
            className="absolute w-full h-full object-cover"
            style={{
              touchAction: "none",
              pointerEvents: "none",
              visibility: "hidden"
            }}
          />
          <canvas
            ref={activeStrokeCanvasRef}
            className="absolute w-full h-full object-cover"
            style={{
              touchAction: "none",
              pointerEvents: "none",
              visibility: "hidden"
            }}
          />
          <canvas
            ref={maskCanvasRef}
            className="absolute w-full h-full object-cover"
            style={{
              touchAction: "none",
              pointerEvents: "none",
              visibility: "hidden",
              zIndex: 1
            }}
          />
          <canvas
            ref={previewCanvasRef}
            data-shape-id={shape.id}
            className="absolute w-full h-full object-cover"
            style={{
              touchAction: "none",
              pointerEvents: tool === "select" ? "none" : "all",
              visibility: "visible",
              zIndex: 2
            }}
            onContextMenu={handleContextMenu}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              handlePointerDown(e);
            }}
            onPointerMove={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handlePointerMove(e);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
              }
              handlePointerUpOrLeave();
            }}
            onPointerLeave={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
              }
              handlePointerUpOrLeave();
            }}
            onPointerCancel={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
              }
              handlePointerUpOrLeave();
            }}
          />
          {/* Processed layers (depth, edge, pose, etc.) */}
          {shape.showSketch && shape.sketchPreviewUrl && (
            <img
              src={shape.sketchPreviewUrl}
              alt="Sketch"
              className="absolute w-full h-full object-cover"
              style={{ opacity: shape.sketchStrength || 0.5 }}
              draggable={false}
            />
          )}
          {(tool === "brush" || tool === "eraser") && (
            <button
              className="absolute -bottom-6 right-0 text-xs px-1.5 py-0.5 bg-gray-300 text-gray-800 rounded hover:bg-red-600 transition-colors"
              style={{ pointerEvents: "all" }}
              onClick={handleClear}
            >
              Reset
            </button>
          )}
        </>
      )}
    </div>
  );
};
