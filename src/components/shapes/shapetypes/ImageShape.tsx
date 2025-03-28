import { useEffect, useRef } from "react";
import { useStore } from "../../../store";
import { Shape } from "../../../types";
import { ImageEditor } from "./ImageEditor";
import { useBrush } from "../../layout/toolbars/BrushTool";
import { useImageCanvas } from "../../../hooks/shapes/useImageCanvas";
import { useEraser } from "../../../hooks/shapes/useEraser";

interface ImageShapeProps {
  shape: Shape;
  tool: "select" | "pan" | "pen" | "brush" | "eraser";
  handleContextMenu: (e: React.MouseEvent) => void;
}

export const ImageShape: React.FC<ImageShapeProps> = ({ shape, tool, handleContextMenu }) => {
  const updateShape = useStore((state) => state.updateShape);
  const selectedShapes = useStore((state) => state.selectedShapes);
  
  const { refs, reapplyMask, updatePreviewCanvas, isScaling } = useImageCanvas({ shape, tool });
  const { handleEraserStroke } = useEraser({ refs, reapplyMask });

  // Add isDrawing ref to track drawing state
  const isDrawing = useRef(false);
  const prevDimensions = useRef({ width: shape.width, height: shape.height });

  // Add effect to handle shape resizing
  useEffect(() => {
    // Check if dimensions changed
    if (shape.width !== prevDimensions.current.width || shape.height !== prevDimensions.current.height) {
      // Update all canvas dimensions
      [refs.backgroundCanvasRef.current, refs.permanentStrokesCanvasRef.current, 
       refs.activeStrokeCanvasRef.current, refs.maskCanvasRef.current, 
       refs.previewCanvasRef.current, refs.redBackgroundCanvasRef.current].forEach(canvas => {
        if (canvas) {
          canvas.width = shape.width;
          canvas.height = shape.height;
        }
      });

      const maskCanvas = refs.maskCanvasRef.current;
      if (maskCanvas) {
        // During scaling, we don't need to modify the mask as it's handled by the scaling state
        if (!isScaling.current) {
          // Create a temporary canvas to store current mask
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = prevDimensions.current.width;
          tempCanvas.height = prevDimensions.current.height;
          const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
          
          if (tempCtx) {
            // Copy current mask to temp canvas
            tempCtx.drawImage(maskCanvas, 0, 0);
            
            // Clear and resize mask canvas
            const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
            if (maskCtx) {
              // Store old dimensions
              const oldWidth = maskCanvas.width;
              const oldHeight = maskCanvas.height;
              
              // First fill with white (fully opaque)
              maskCtx.fillStyle = 'white';
              maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
              
              // Then draw the scaled previous mask using destination-in
              maskCtx.globalCompositeOperation = 'destination-in';
              maskCtx.drawImage(
                tempCanvas,
                0, 0, oldWidth, oldHeight,
                0, 0, shape.width, shape.height
              );
              maskCtx.globalCompositeOperation = 'source-over';
            }
          }
        }
      }
      
      // Update preview with the scaled mask
      requestAnimationFrame(() => {
        updatePreviewCanvas();
        
        // After the preview is updated, save the new mask state
        if (maskCanvas) {
          const maskData = maskCanvas.toDataURL('image/png');
          updateShape(shape.id, { maskCanvasData: maskData });
        }
      });
      
      // Update stored dimensions
      prevDimensions.current = { width: shape.width, height: shape.height };
    }
  }, [shape.width, shape.height, isScaling, refs, updatePreviewCanvas, updateShape, shape.id]);

  // Add effect to handle tool transitions
  useEffect(() => {
    // When switching from eraser to brush, reset the mask to fully opaque
    if (tool === "brush" && refs.maskCanvasRef.current) {
      const maskCtx = refs.maskCanvasRef.current.getContext("2d", { willReadFrequently: true });
      if (maskCtx) {
        maskCtx.clearRect(0, 0, refs.maskCanvasRef.current.width, refs.maskCanvasRef.current.height);
        maskCtx.fillStyle = 'white';
        maskCtx.fillRect(0, 0, refs.maskCanvasRef.current.width, refs.maskCanvasRef.current.height);
      }
      // Update preview to show the reset state
      updatePreviewCanvas();
    }
  }, [tool, refs.maskCanvasRef, updatePreviewCanvas]);

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
    };

    const isSelected = selectedShapes.includes(shape.id);
    // First check if we're deselecting and not using brush/eraser tools
    if (!isSelected && tool !== "brush" && tool !== "eraser") {
      cleanup();
    }

    // Clean up on unmount
    return () => {
      if (isDrawing.current) {
        cleanup();
      }
    };
  }, [selectedShapes, shape.id, refs, updatePreviewCanvas, tool]);

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
      updatePreviewCanvas();
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
              touchAction: "none",
              pointerEvents: "none",
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
              touchAction: "none",
              pointerEvents: "none",
              opacity: 1,
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
              touchAction: "none",
              pointerEvents: "none",
              opacity: 1,
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
              touchAction: "none",
              pointerEvents: "none",
              opacity: 1,
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
              touchAction: "none",
              pointerEvents: "none",
              opacity: 1,
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
              touchAction: "none",
              pointerEvents: tool === "select" ? "none" : "all",
              opacity: 1,
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
