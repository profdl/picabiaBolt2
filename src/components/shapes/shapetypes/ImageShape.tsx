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

  const subscriptionRef = useRef<{
    [key: string]: ReturnType<typeof supabase.channel>;
  }>({});

  const { handlePointerDown, handlePointerMove, handlePointerUpOrLeave } = useBrush({
    backgroundCanvasRef,
    permanentStrokesCanvasRef,
    activeStrokeCanvasRef,
    previewCanvasRef,
    maskCanvasRef
  });

  // Initialize canvases with image
  useEffect(() => {
    console.log('ImageShape initialization started:', {
      hasImageUrl: !!shape.imageUrl,
      canvasRefs: {
        background: !!backgroundCanvasRef.current,
        permanent: !!permanentStrokesCanvasRef.current,
        active: !!activeStrokeCanvasRef.current,
        preview: !!previewCanvasRef.current,
        mask: !!maskCanvasRef.current
      }
    });

    if (!backgroundCanvasRef.current || !permanentStrokesCanvasRef.current || 
        !activeStrokeCanvasRef.current || !previewCanvasRef.current || 
        !maskCanvasRef.current || !shape.imageUrl) return;

    const backgroundCanvas = backgroundCanvasRef.current;
    const permanentCanvas = permanentStrokesCanvasRef.current;
    const activeCanvas = activeStrokeCanvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    
    const bgCtx = backgroundCanvas.getContext('2d', { willReadFrequently: true });
    const permanentCtx = permanentCanvas.getContext('2d', { willReadFrequently: true });
    const activeCtx = activeCanvas.getContext('2d', { willReadFrequently: true });
    const previewCtx = previewCanvas.getContext('2d', { willReadFrequently: true });
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    
    if (!bgCtx || !permanentCtx || !activeCtx || !previewCtx || !maskCtx) return;

    // Clear all canvases first
    [backgroundCanvas, permanentCanvas, activeCanvas, previewCanvas, maskCanvas].forEach(canvas => {
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
      [backgroundCanvas, permanentCanvas, activeCanvas, previewCanvas, maskCanvas].forEach(canvas => {
        canvas.width = width;
        canvas.height = height;
      });

      // Draw image on background canvas
      if (!bgCtx || !previewCtx || !permanentCtx || !maskCtx) return;

      bgCtx.drawImage(img, 0, 0, width, height);
      console.log('Background canvas drawn');

      // Create and apply the mask
      maskCtx.clearRect(0, 0, width, height);
      
      // Create a radial gradient for the mask
      const gradient = maskCtx.createRadialGradient(
        width/2, height/2, 0,
        width/2, height/2, width/3
      );
      gradient.addColorStop(0, 'white');  // Fully visible center
      gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.5)');  // Semi-transparent middle
      gradient.addColorStop(1, 'transparent');  // Fully transparent edges
      
      maskCtx.fillStyle = gradient;
      maskCtx.fillRect(0, 0, width, height);
      console.log('Mask canvas drawn');

      // Clear preview canvas
      previewCtx.clearRect(0, 0, width, height);
      
      // Draw the background image to preview canvas
      previewCtx.save();
      previewCtx.drawImage(backgroundCanvas, 0, 0);
      
      // Apply the mask
      previewCtx.globalCompositeOperation = 'destination-in';
      previewCtx.drawImage(maskCanvas, 0, 0);
      previewCtx.restore();
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
