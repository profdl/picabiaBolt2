import { useEffect, useRef } from "react";
import { useStore } from "../../../store";
import { Shape } from "../../../types";
import { ImageCropper } from "../../shared/ImageCropper";
import { useBrush } from "../../layout/toolbars/BrushTool";
import { useImageCanvas } from "../../../hooks/shapes/useImageCanvas";
import { useEraser } from "../../../hooks/shapes/useEraser";
import { updateImageShapePreview } from "../../../utils/imageShapeCanvas";

interface SavedCanvasState {
  backgroundData?: string;
  permanentStrokesData?: string;
  activeStrokeData?: string;
  maskData?: string;
  previewData?: string;
}

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
  const { handleEraserStroke, resetEraserStroke } = useEraser({ refs });

  // Add isDrawing ref to track drawing state
  const isDrawing = useRef(false);

  // Add effect to restore canvas state
  useEffect(() => {
    if (!shape.isImageEditing && shape.savedCanvasState) {
      // Restore canvas states from saved data
      const loadImage = (dataUrl: string): Promise<HTMLImageElement> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = dataUrl;
        });
      };

      const restoreCanvasState = async () => {
        const { backgroundData, permanentStrokesData, activeStrokeData, maskData, previewData } = shape.savedCanvasState!;

        if (backgroundData && refs.backgroundCanvasRef.current) {
          const img = await loadImage(backgroundData);
          const ctx = refs.backgroundCanvasRef.current.getContext('2d');
          ctx?.drawImage(img, 0, 0);
        }

        if (permanentStrokesData && refs.permanentStrokesCanvasRef.current) {
          const img = await loadImage(permanentStrokesData);
          const ctx = refs.permanentStrokesCanvasRef.current.getContext('2d');
          ctx?.drawImage(img, 0, 0);
        }

        if (activeStrokeData && refs.activeStrokeCanvasRef.current) {
          const img = await loadImage(activeStrokeData);
          const ctx = refs.activeStrokeCanvasRef.current.getContext('2d');
          ctx?.drawImage(img, 0, 0);
        }

        if (maskData && refs.maskCanvasRef.current) {
          const img = await loadImage(maskData);
          const ctx = refs.maskCanvasRef.current.getContext('2d');
          ctx?.drawImage(img, 0, 0);
        }

        if (previewData && refs.previewCanvasRef.current) {
          const img = await loadImage(previewData);
          const ctx = refs.previewCanvasRef.current.getContext('2d');
          ctx?.drawImage(img, 0, 0);
        }
      };

      restoreCanvasState();
    }
  }, [shape.isImageEditing, shape.savedCanvasState, refs]);

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

      // Reapply mask if using inpainting tool
      if (tool === "inpaint") {
        reapplyMask();
      }
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
  }, [selectedShapes, shape.id, refs, updatePreviewCanvas, tool, resetEraserStroke, reapplyMask]);

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

  // Setup brush handlers
  const { handlePointerDown: originalHandlePointerDown, handlePointerMove: originalHandlePointerMove, handlePointerUpOrLeave: originalHandlePointerUpOrLeave } = useBrush({
    backgroundCanvasRef: refs.backgroundCanvasRef,
    permanentStrokesCanvasRef: refs.permanentStrokesCanvasRef,
    activeStrokeCanvasRef: refs.activeStrokeCanvasRef,
    previewCanvasRef: refs.previewCanvasRef,
    maskCanvasRef: refs.maskCanvasRef
  });

  // Helper for determining which tool handler to use
  const isEraserTool = () => tool === 'eraser';

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    
    // Use appropriate handler based on tool
    if (isEraserTool()) {
      handleEraserStroke(e);
    } else {
      originalHandlePointerDown(e);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    
    // Use appropriate handler based on tool
    if (isEraserTool()) {
      handleEraserStroke(e);
    } else {
      originalHandlePointerMove(e);
    }
  };

  const handlePointerUpOrLeave = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    
    // Use appropriate handler based on tool
    if (isEraserTool()) {
      // For eraser tool, update the view with the appropriate settings
      updateImageShapePreview({
        backgroundCanvasRef: refs.backgroundCanvasRef,
        permanentStrokesCanvasRef: refs.permanentStrokesCanvasRef,
        activeStrokeCanvasRef: refs.activeStrokeCanvasRef,
        previewCanvasRef: refs.previewCanvasRef,
        maskCanvasRef: refs.maskCanvasRef,
        tool: 'eraser',
        opacity: useStore.getState().brushOpacity
      });
      
      // Reset the eraser's last point
      resetEraserStroke();
    } else {
      // For brush and inpainting tools, use the original handler
      originalHandlePointerUpOrLeave();
      updatePreviewCanvas();
    }
  };

  const handleStartEditing = () => {
    // First save the current canvas states
    const canvasState: SavedCanvasState = {
      backgroundData: refs.backgroundCanvasRef.current?.toDataURL(),
      permanentStrokesData: refs.permanentStrokesCanvasRef.current?.toDataURL(),
      activeStrokeData: refs.activeStrokeCanvasRef.current?.toDataURL(),
      maskData: refs.maskCanvasRef.current?.toDataURL(),
      previewData: refs.previewCanvasRef.current?.toDataURL()
    };

    // Save the canvas data to the shape state
    updateShape(shape.id, {
      canvasData: refs.backgroundCanvasRef.current?.toDataURL(),
      backgroundCanvasData: refs.backgroundCanvasRef.current?.toDataURL(),
      permanentCanvasData: refs.permanentStrokesCanvasRef.current?.toDataURL(),
      activeCanvasData: refs.activeStrokeCanvasRef.current?.toDataURL(),
      previewCanvasData: refs.previewCanvasRef.current?.toDataURL(),
      maskCanvasData: refs.maskCanvasRef.current?.toDataURL(),
      savedCanvasState: canvasState,
      isImageEditing: true
    });
  };

  const handleCloseEditing = () => {
    updateShape(shape.id, {
      isImageEditing: false
    });
  };

  // Add effect to initialize canvases from saved data
  useEffect(() => {
    if (shape.isImageEditing) {
        // When entering edit mode, ensure canvases maintain their state
        if (shape.backgroundCanvasData && refs.backgroundCanvasRef.current) {
            const img = new Image();
            img.onload = () => {
                const ctx = refs.backgroundCanvasRef.current?.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                }
            };
            img.src = shape.backgroundCanvasData;
        }

        if (shape.previewCanvasData && refs.previewCanvasRef.current) {
            const img = new Image();
            img.onload = () => {
                const ctx = refs.previewCanvasRef.current?.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                }
            };
            img.src = shape.previewCanvasData;
        }
    }
  }, [shape.isImageEditing, shape.backgroundCanvasData, shape.previewCanvasData, refs]);

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

  if (shape.isImageEditing && shape.type === "image") {
    return (
      <ImageCropper
        imageUrl={shape.imageUrl || ''}
        sourceShape={shape}
        onClose={handleCloseEditing}
      />
    );
  }

  return (
    <div className="relative w-full h-full">
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
        onDoubleClick={handleStartEditing}
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
        onDoubleClick={handleStartEditing}
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
    </div>
  );
};
