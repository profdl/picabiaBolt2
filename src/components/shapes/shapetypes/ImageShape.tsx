import { useEffect, useRef } from "react";
import { useStore } from "../../../store";
import { Shape } from "../../../types";
import { ImageEditor } from "./ImageEditor";
import { useBrush } from "../../layout/toolbars/BrushTool";
import { useImageCanvas } from "../../../hooks/shapes/useImageCanvas";
import { useEraser } from "../../../hooks/shapes/useEraser";
import { updateImageShapePreview } from "../../../utils/imageShapeCanvas";

// Add utility function for consistent sizing
const calculateImageShapeDimensions = (width: number, height: number): { width: number; height: number } => {
  const MAX_DIMENSION = 512;
  const aspectRatio = width / height;
  
  let scaledWidth: number;
  let scaledHeight: number;
  
  if (aspectRatio > 1) {
    // Width is larger than height
    scaledWidth = MAX_DIMENSION;
    scaledHeight = Math.round(MAX_DIMENSION / aspectRatio);
  } else {
    // Height is larger than or equal to width
    scaledHeight = MAX_DIMENSION;
    scaledWidth = Math.round(MAX_DIMENSION * aspectRatio);
  }
  
  return { width: scaledWidth, height: scaledHeight };
};

interface ImageShapeProps {
  shape: Shape;
  tool: "select" | "pan" | "pen" | "brush" | "eraser" | "inpaint";
  handleContextMenu: (e: React.MouseEvent) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

export const ImageShape: React.FC<ImageShapeProps> = ({ 
  shape, 
  tool, 
  handleContextMenu,
}) => {
  const updateShape = useStore((state) => state.updateShape);
  const selectedShapes = useStore((state) => state.selectedShapes);
  
  const { refs, reapplyMask, updatePreviewCanvas } = useImageCanvas({ shape, tool });
  const { handleEraserStroke, resetEraserStroke } = useEraser({ refs, reapplyMask });

  // Add isDrawing ref to track drawing state
  const isDrawing = useRef(false);

  // Add effect to handle initial sizing
  useEffect(() => {
    if (shape.type === "image" && !shape.originalWidth) {
      const dimensions = calculateImageShapeDimensions(shape.width, shape.height);
      updateShape(shape.id, {
        width: dimensions.width,
        height: dimensions.height,
        originalWidth: shape.width,
        originalHeight: shape.height
      });
    }
  }, [shape.id, shape.type, shape.width, shape.height, shape.originalWidth, updateShape]);

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
      updatePreviewCanvas();
      
      // Reset eraser state to ensure clean state between tools
      resetEraserStroke();
    };

    const isSelected = selectedShapes.includes(shape.id);
    // First check if we're deselecting and not using brush/eraser tools
    if (!isSelected && tool !== "brush" && tool !== "eraser" && tool !== "inpaint") {
      cleanup();
    }

    // Clean up on unmount
    return () => {
      if (isDrawing.current) {
        cleanup();
      }
    };
  }, [selectedShapes, shape.id, refs, updatePreviewCanvas, tool, resetEraserStroke]);

  // Add effect to reset state when switching tools
  useEffect(() => {
    // Reset eraser state when switching tools
    resetEraserStroke();
    
    // If switching away from eraser/inpaint, ensure everything is cleaned up
    if (tool !== 'eraser' && tool !== 'inpaint') {
      // Update preview to ensure we see the final result
      updatePreviewCanvas();
    }
  }, [tool, resetEraserStroke, updatePreviewCanvas]);

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
    if (tool === 'eraser' || tool === 'inpaint') {
      handleEraserStroke(e);
    } else {
      originalHandlePointerDown(e);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    
    if (tool === 'eraser' || tool === 'inpaint') {
      handleEraserStroke(e);
    } else {
      originalHandlePointerMove(e);
    }
  };

  const handlePointerUpOrLeave = () => {
    isDrawing.current = false;
    if (tool === 'eraser' || tool === 'inpaint') {
      // For eraser and inpaint tools, we've already updated the mask during the stroke
      // Pass the tool info to ensure consistency with active stroke behavior
      updateImageShapePreview({
        backgroundCanvasRef: refs.backgroundCanvasRef,
        permanentStrokesCanvasRef: refs.permanentStrokesCanvasRef,
        activeStrokeCanvasRef: refs.activeStrokeCanvasRef,
        previewCanvasRef: refs.previewCanvasRef,
        maskCanvasRef: refs.maskCanvasRef,
        tool: tool,
        // Use fixed opacity (1.0) for in-paint tool
        opacity: tool === 'inpaint' ? 1.0 : useStore.getState().brushOpacity
      });
      
      // Reset the eraser's last point using the dedicated function
      resetEraserStroke();
      
      return;
    }
    // For brush tool, handle the brush stroke completion and update preview
    originalHandlePointerUpOrLeave();
    updatePreviewCanvas();
  };

  // Handle clearing strokes
  const handleClear = () => {
    if (!refs.permanentStrokesCanvasRef.current || !refs.previewCanvasRef.current) return;
    
    // Clear permanent strokes
    const permanentCtx = refs.permanentStrokesCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (permanentCtx) {
      permanentCtx.clearRect(0, 0, refs.permanentStrokesCanvasRef.current.width, refs.permanentStrokesCanvasRef.current.height);
    }
    
    // Clear active stroke
    if (refs.activeStrokeCanvasRef.current) {
      const activeCtx = refs.activeStrokeCanvasRef.current.getContext('2d', { willReadFrequently: true });
      if (activeCtx) {
        activeCtx.clearRect(0, 0, refs.activeStrokeCanvasRef.current.width, refs.activeStrokeCanvasRef.current.height);
      }
    }
    
    // Reset mask to fully opaque
    if (refs.maskCanvasRef?.current) {
      const maskCtx = refs.maskCanvasRef.current.getContext('2d', { willReadFrequently: true });
      if (maskCtx) {
        maskCtx.clearRect(0, 0, refs.maskCanvasRef.current.width, refs.maskCanvasRef.current.height);
        maskCtx.fillStyle = 'white';
        maskCtx.fillRect(0, 0, refs.maskCanvasRef.current.width, refs.maskCanvasRef.current.height);
      }
    }
    
    // Clear preview
    const previewCtx = refs.previewCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (previewCtx) {
      previewCtx.clearRect(0, 0, refs.previewCanvasRef.current.width, refs.previewCanvasRef.current.height);
    }
    
    // Update preview with all layers
    updatePreviewCanvas();
    
    // Reset all canvas data
    updateShape(shape.id, {
      canvasData: undefined,
      backgroundCanvasData: undefined,
      permanentCanvasData: undefined,
      activeCanvasData: undefined,
      previewCanvasData: undefined,
      maskCanvasData: undefined,
      redBackgroundCanvasData: undefined
    });
  };

  // Common canvas style with GPU acceleration
  const canvasStyle = {
    touchAction: "none" as const,
    pointerEvents: "none" as const,
    opacity: 1,
    transform: "translateZ(0)",
    willChange: "transform" as const,
    backfaceVisibility: "hidden" as const,
    WebkitBackfaceVisibility: "hidden" as const,
    WebkitTransform: "translateZ(0)",
    WebkitWillChange: "transform" as const,
  };

  return (
    <div className="relative w-full h-full">
      {shape.isImageEditing ? (
        <ImageEditor shape={shape} updateShape={updateShape} />
      ) : (
        <>
          <canvas
            ref={refs.redBackgroundCanvasRef}
            data-shape-id={shape.id}
            data-layer="redBackground"
            className="absolute w-full h-full object-cover"
            style={{
              ...canvasStyle,
              opacity: 0.25,
              zIndex: 0,
              visibility: "hidden"
            }}
          />
          <canvas
            ref={refs.backgroundCanvasRef}
            data-shape-id={shape.id}
            data-layer="background"
            className="absolute w-full h-full object-cover"
            style={{
              ...canvasStyle,
              zIndex: 1,
              visibility: "hidden"
            }}
          />
          <canvas
            ref={refs.permanentStrokesCanvasRef}
            data-shape-id={shape.id}
            data-layer="permanent"
            className="absolute w-full h-full object-cover"
            style={{
              ...canvasStyle,
              zIndex: 2,
              visibility: "hidden"
            }}
          />
          <canvas
            ref={refs.activeStrokeCanvasRef}
            data-shape-id={shape.id}
            data-layer="active"
            className="absolute w-full h-full object-cover"
            style={{
              ...canvasStyle,
              zIndex: 3,
              visibility: "hidden"
            }}
          />
          <canvas
            ref={refs.maskCanvasRef}
            data-shape-id={shape.id}
            data-layer="mask"
            className="absolute w-full h-full object-cover"
            style={{
              ...canvasStyle,
              zIndex: 4,
              visibility: "hidden"
            }}
          />
          <canvas
            ref={refs.previewCanvasRef}
            data-shape-id={shape.id}
            data-layer="preview"
            className="absolute w-full h-full object-cover"
            style={{
              ...canvasStyle,
              pointerEvents: tool === "select" ? "none" : "all",
              zIndex: 5,
              visibility: "visible"
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
          {(tool === "brush" || tool === "eraser" || tool === "inpaint") && (
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
