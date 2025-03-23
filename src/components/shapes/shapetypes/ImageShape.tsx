import { useEffect, useRef } from "react";
import { useStore } from "../../../store";
import { Shape } from "../../../types";
import { supabase } from "../../../lib/supabase";
import { ImageEditor } from "./ImageEditor";
import { useBrush } from "../../layout/toolbars/BrushTool";
import { useImageCanvas } from "../../../hooks/shapes/useImageCanvas";
import { useEraser } from "../../../hooks/shapes/useEraser";

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
  const selectedShapes = useStore((state) => state.selectedShapes);
  const setTool = useStore((state) => state.setTool);
  
  const { refs, reapplyMask } = useImageCanvas({ shape, tool });
  const { handleEraserStroke } = useEraser({ refs, reapplyMask });

  // Add isDrawing ref to track drawing state
  const isDrawing = useRef(false);

  // Add effect to handle tool state on deselection
  useEffect(() => {
    const cleanup = () => {
      // Clear any active drawing state
      isDrawing.current = false;
      
      // Clear active stroke canvas if it exists
      if (refs.activeStrokeCanvasRef.current) {
        const activeCtx = refs.activeStrokeCanvasRef.current.getContext("2d", { willReadFrequently: true });
        if (activeCtx) {
          activeCtx.clearRect(0, 0, refs.activeStrokeCanvasRef.current.width, refs.activeStrokeCanvasRef.current.height);
        }
      }
      
      // Update preview to show final state
      if (refs.previewCanvasRef.current && refs.backgroundCanvasRef.current && refs.permanentStrokesCanvasRef.current) {
        const previewCtx = refs.previewCanvasRef.current.getContext("2d", { willReadFrequently: true });
        if (previewCtx) {
          previewCtx.clearRect(0, 0, refs.previewCanvasRef.current.width, refs.previewCanvasRef.current.height);
          previewCtx.drawImage(refs.backgroundCanvasRef.current, 0, 0);
          previewCtx.drawImage(refs.permanentStrokesCanvasRef.current, 0, 0);
        }
      }
    };

    const isSelected = selectedShapes.includes(shape.id);
    // First check if we're deselecting
    if (!isSelected) {
      // Then safely check the tool type
      const currentTool = useStore.getState().tool;
      if (currentTool === 'eraser' || currentTool === 'brush') {
        setTool('select');
        cleanup();
      }
    }

    // Clean up on unmount
    return () => {
      if (isDrawing.current) {
        cleanup();
      }
    };
  }, [selectedShapes, shape.id, setTool, refs]);

  // Modify brush handlers to use reapplyMask
  const { handlePointerDown: originalHandlePointerDown, handlePointerMove: originalHandlePointerMove, handlePointerUpOrLeave: originalHandlePointerUpOrLeave } = useBrush({
    backgroundCanvasRef: refs.backgroundCanvasRef,
    permanentStrokesCanvasRef: refs.permanentStrokesCanvasRef,
    activeStrokeCanvasRef: refs.activeStrokeCanvasRef,
    previewCanvasRef: refs.previewCanvasRef,
    maskCanvasRef: refs.maskCanvasRef
  });

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    if (tool === 'eraser') {
      handleEraserStroke(e);
    } else {
      originalHandlePointerDown(e);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    
    if (tool === 'eraser') {
      handleEraserStroke(e);
    } else {
      originalHandlePointerMove(e);
    }
  };

  const handlePointerUpOrLeave = () => {
    isDrawing.current = false;
    if (tool === 'eraser') {
      // For eraser tool, we've already updated the mask during the stroke
      return;
    }
    // For brush tool, just handle the brush stroke completion
    originalHandlePointerUpOrLeave();
  };

  const subscriptionRef = useRef<{
    [key: string]: ReturnType<typeof supabase.channel>;
  }>({});

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

  // Handle clearing strokes
  const handleClear = () => {
    if (!refs.permanentStrokesCanvasRef.current || !refs.previewCanvasRef.current) return;
    const ctx = refs.permanentStrokesCanvasRef.current.getContext('2d', { willReadFrequently: true });
    const previewCtx = refs.previewCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx || !previewCtx) return;
    
    ctx.clearRect(0, 0, refs.permanentStrokesCanvasRef.current.width, refs.permanentStrokesCanvasRef.current.height);
    previewCtx.clearRect(0, 0, refs.previewCanvasRef.current.width, refs.previewCanvasRef.current.height);
    
    // When clearing strokes, set canvasData to undefined
    updateShape(shape.id, { canvasData: undefined });
  };

  return (
    <div className="relative w-full h-full">
      {shape.isImageEditing ? (
        <ImageEditor shape={shape} updateShape={updateShape} />
      ) : (
        <>
          <canvas
            ref={refs.redBackgroundCanvasRef}
            className="absolute w-full h-full object-cover"
            style={{
              touchAction: "none",
              pointerEvents: "none",
              visibility: "visible",
              zIndex: 0
            }}
          />
          <canvas
            ref={refs.backgroundCanvasRef}
            className="absolute w-full h-full object-cover"
            style={{
              touchAction: "none",
              pointerEvents: "none",
              visibility: "hidden"
            }}
          />
          <canvas
            ref={refs.permanentStrokesCanvasRef}
            className="absolute w-full h-full object-cover"
            style={{
              touchAction: "none",
              pointerEvents: "none",
              visibility: "hidden"
            }}
          />
          <canvas
            ref={refs.activeStrokeCanvasRef}
            className="absolute w-full h-full object-cover"
            style={{
              touchAction: "none",
              pointerEvents: "none",
              visibility: "hidden"
            }}
          />
          <canvas
            ref={refs.maskCanvasRef}
            className="absolute w-full h-full object-cover"
            style={{
              touchAction: "none",
              pointerEvents: "none",
              visibility: "hidden",
              zIndex: 1
            }}
          />
          <canvas
            ref={refs.previewCanvasRef}
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
