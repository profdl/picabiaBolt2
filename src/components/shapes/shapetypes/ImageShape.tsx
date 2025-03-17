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
  
  // Create mutable object to store canvas references
  const canvasRefs = useRef({
    background: document.createElement('canvas'),
    permanent: document.createElement('canvas'),
    active: document.createElement('canvas'),
    preview: document.createElement('canvas')
  });

  const subscriptionRef = useRef<{
    [key: string]: ReturnType<typeof supabase.channel>;
  }>({});

  const { handlePointerDown, handlePointerMove, handlePointerUpOrLeave } = useBrush({
    backgroundCanvasRef,
    permanentStrokesCanvasRef,
    activeStrokeCanvasRef,
    previewCanvasRef
  });

  // Initialize canvases with image
  useEffect(() => {
    if (!backgroundCanvasRef.current || !permanentStrokesCanvasRef.current || 
        !activeStrokeCanvasRef.current || !previewCanvasRef.current || !shape.imageUrl) return;

    const backgroundCanvas = backgroundCanvasRef.current;
    const permanentCanvas = permanentStrokesCanvasRef.current;
    const activeCanvas = activeStrokeCanvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    
    const bgCtx = backgroundCanvas.getContext('2d', { willReadFrequently: true });
    const permanentCtx = permanentCanvas.getContext('2d', { willReadFrequently: true });
    const activeCtx = activeCanvas.getContext('2d', { willReadFrequently: true });
    const previewCtx = previewCanvas.getContext('2d', { willReadFrequently: true });
    
    if (!bgCtx || !permanentCtx || !activeCtx || !previewCtx) return;

    // Clear all canvases first
    [backgroundCanvas, permanentCanvas, activeCanvas, previewCanvas].forEach(canvas => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    // Load and draw the image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Set canvas dimensions to match the image's aspect ratio
      const aspectRatio = img.width / img.height;
      const width = 512;
      const height = 512 / aspectRatio;

      // Set dimensions for all canvases
      [backgroundCanvas, permanentCanvas, activeCanvas, previewCanvas].forEach(canvas => {
        canvas.width = width;
        canvas.height = height;
      });

      // Draw image on background canvas
      bgCtx.drawImage(img, 0, 0, width, height);

      // Initialize auxiliary canvases
      canvasRefs.current.background.width = width;
      canvasRefs.current.background.height = height;
      canvasRefs.current.permanent.width = width;
      canvasRefs.current.permanent.height = height;
      canvasRefs.current.active.width = width;
      canvasRefs.current.active.height = height;
      canvasRefs.current.preview.width = width;
      canvasRefs.current.preview.height = height;

      // Clear all canvases except background
      [permanentCanvas, activeCanvas, previewCanvas].forEach(canvas => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
        }
      });

      // If we have existing canvas data, restore it to the permanent canvas
      if (shape.canvasData) {
        const savedImg = new Image();
        savedImg.onload = () => {
          permanentCtx.drawImage(savedImg, 0, 0);
          // Also draw to preview canvas initially
          previewCtx.drawImage(savedImg, 0, 0);
        };
        savedImg.src = shape.canvasData;
      }
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
              pointerEvents: "none"
            }}
          />
          <canvas
            ref={permanentStrokesCanvasRef}
            className="absolute w-full h-full object-cover"
            style={{
              touchAction: "none",
              pointerEvents: "none"
            }}
          />
          <canvas
            ref={activeStrokeCanvasRef}
            className="absolute w-full h-full object-cover"
            style={{
              touchAction: "none",
              pointerEvents: "none"
            }}
          />
          <canvas
            ref={previewCanvasRef}
            data-shape-id={shape.id}
            className="absolute w-full h-full object-cover"
            style={{
              touchAction: "none",
              pointerEvents: tool === "select" ? "none" : "all"
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
