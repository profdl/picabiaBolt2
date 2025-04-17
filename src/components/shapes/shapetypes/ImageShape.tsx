import { useEffect, useRef, useCallback } from "react";
import { useStore } from "../../../store";
import { ImageShape as ImageShapeType } from "../../../types/shapes";
import { ImageCropper } from "../../shared/ImageCropper";
import { useBrush } from "../../layout/toolbars/BrushTool";
import { useImageCanvas } from "../../../hooks/shapes/useImageCanvas";
import { useEraser } from "../../../hooks/shapes/useEraser";
import { updateImageShapePreview } from "../../../utils/imageShapeCanvas";
import { createShaderProgram, vertexShaderSource, fragmentShaderSource, createTexture, createBuffer } from "../../../utils/shaders";

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
  shape: ImageShapeType;
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

  // Add WebGL canvas ref and program ref
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const positionBufferRef = useRef<WebGLBuffer | null>(null);
  const texCoordBufferRef = useRef<WebGLBuffer | null>(null);

  // Initialize WebGL
  const initWebGL = useCallback(() => {
    const canvas = webglCanvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    // Create shader program
    const program = createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
    programRef.current = program;

    // Create position buffer
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);
    positionBufferRef.current = createBuffer(gl, positions);

    // Create texture coordinate buffer
    const texCoords = new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1,
    ]);
    texCoordBufferRef.current = createBuffer(gl, texCoords);

    // Set up the program
    gl.useProgram(program);

    // Get attribute locations
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');

    // Set up position attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferRef.current);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Set up texture coordinate attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBufferRef.current);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    const contrastLocation = gl.getUniformLocation(program, 'u_contrast');
    const saturationLocation = gl.getUniformLocation(program, 'u_saturation');
    const brightnessLocation = gl.getUniformLocation(program, 'u_brightness');

    // Set initial uniform values from shape properties
    gl.uniform1f(contrastLocation, shape.contrast ?? 1.0);
    gl.uniform1f(saturationLocation, shape.saturation ?? 1.0);
    gl.uniform1f(brightnessLocation, shape.brightness ?? 1.0);

    // Save the initial state
    const shapeId = canvas.dataset.shapeId;
    if (shapeId) {
      useStore.getState().updateShape(shapeId, {
        contrast: shape.contrast ?? 1.0,
        saturation: shape.saturation ?? 1.0,
        brightness: shape.brightness ?? 1.0
      });
    }
  }, [shape.contrast, shape.saturation, shape.brightness]);

  // Update WebGL rendering
  const updateWebGL = useCallback(() => {
    const canvas = webglCanvasRef.current;
    if (!canvas || !programRef.current) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    // Set up the program
    gl.useProgram(programRef.current);

    // Get uniform locations
    const contrastLocation = gl.getUniformLocation(programRef.current, 'u_contrast');
    const saturationLocation = gl.getUniformLocation(programRef.current, 'u_saturation');
    const brightnessLocation = gl.getUniformLocation(programRef.current, 'u_brightness');

    // Update uniform values
    gl.uniform1f(contrastLocation, shape.contrast ?? 1.0);
    gl.uniform1f(saturationLocation, shape.saturation ?? 1.0);
    gl.uniform1f(brightnessLocation, shape.brightness ?? 1.0);

    // Draw the quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }, [shape.contrast, shape.saturation, shape.brightness]);

  // Update texture when source changes
  const updateTexture = useCallback(() => {
    const canvas = webglCanvasRef.current;
    if (!canvas || !programRef.current) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    // Create a temporary canvas to combine all layers
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Draw all layers in order
    if (refs.backgroundCanvasRef.current) {
      tempCtx.drawImage(refs.backgroundCanvasRef.current, 0, 0);
    }
    if (refs.permanentStrokesCanvasRef.current) {
      tempCtx.drawImage(refs.permanentStrokesCanvasRef.current, 0, 0);
    }
    if (refs.activeStrokeCanvasRef.current) {
      tempCtx.drawImage(refs.activeStrokeCanvasRef.current, 0, 0);
    }

    // Create or update texture
    if (!textureRef.current) {
      textureRef.current = createTexture(gl, tempCanvas);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tempCanvas);
    }

    // Update WebGL rendering with current shader settings
    updateWebGL();
  }, [refs, updateWebGL]);

  // Initialize WebGL on mount
  useEffect(() => {
    initWebGL();
  }, [initWebGL]);

  // Update texture and rendering when layers change
  useEffect(() => {
    updateTexture();
  }, [updateTexture]);

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

  // Add effect to apply contrast filter
  useEffect(() => {
    if (refs.previewCanvasRef.current) {
      const previewCtx = refs.previewCanvasRef.current.getContext('2d');
      if (previewCtx) {
        // Clear the preview canvas
        previewCtx.clearRect(0, 0, refs.previewCanvasRef.current.width, refs.previewCanvasRef.current.height);
        
        // Apply filters
        const contrast = shape.contrast ?? 1.0;
        const saturation = shape.saturation ?? 1.0;
        const brightness = shape.brightness ?? 1.0;
        previewCtx.filter = `contrast(${contrast}) saturate(${saturation}) brightness(${brightness})`;
        
        // Draw all layers
        if (refs.backgroundCanvasRef.current) {
          previewCtx.drawImage(refs.backgroundCanvasRef.current, 0, 0);
        }
        if (refs.permanentStrokesCanvasRef.current) {
          previewCtx.drawImage(refs.permanentStrokesCanvasRef.current, 0, 0);
        }
        if (refs.activeStrokeCanvasRef.current) {
          previewCtx.drawImage(refs.activeStrokeCanvasRef.current, 0, 0);
        }
        
        // Reset filter for next draw
        previewCtx.filter = 'none';
      }
    }
  }, [shape.contrast, shape.saturation, shape.brightness, refs]);

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
        opacity: useStore.getState().brushOpacity,
        contrast: shape.contrast ?? 1.0,
        saturation: shape.saturation ?? 1.0,
        brightness: shape.brightness ?? 1.0
      });
      
      // Reset the eraser's last point
      resetEraserStroke();
    } else {
      // For brush and inpainting tools, use the original handler
      originalHandlePointerUpOrLeave();
      updatePreviewCanvas();
    }

    // Save shader settings after any tool operation
    updateShape(shape.id, {
      contrast: shape.contrast ?? 1.0,
      saturation: shape.saturation ?? 1.0,
      brightness: shape.brightness ?? 1.0
    });
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
      isImageEditing: true,
      // Save shader settings
      contrast: shape.contrast ?? 1.0,
      saturation: shape.saturation ?? 1.0,
      brightness: shape.brightness ?? 1.0
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

  // Add a new effect to handle shader updates
  useEffect(() => {
    const canvas = webglCanvasRef.current;
    if (!canvas || !programRef.current) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    // Get uniform locations
    const contrastLocation = gl.getUniformLocation(programRef.current, 'u_contrast');
    const saturationLocation = gl.getUniformLocation(programRef.current, 'u_saturation');
    const brightnessLocation = gl.getUniformLocation(programRef.current, 'u_brightness');

    // Update uniform values
    gl.uniform1f(contrastLocation, shape.contrast ?? 1.0);
    gl.uniform1f(saturationLocation, shape.saturation ?? 1.0);
    gl.uniform1f(brightnessLocation, shape.brightness ?? 1.0);

    // Save the updated state
    const shapeId = canvas.dataset.shapeId;
    if (shapeId) {
      useStore.getState().updateShape(shapeId, {
        contrast: shape.contrast ?? 1.0,
        saturation: shape.saturation ?? 1.0,
        brightness: shape.brightness ?? 1.0
      });
    }

    // Redraw with new settings
    updateWebGL();
  }, [shape.contrast, shape.saturation, shape.brightness, updateWebGL]);

  // Add effect to save shader settings whenever they change
  useEffect(() => {
    // Skip initial render
    if (!shape.id) return;
    
    // Save shader settings to store
    updateShape(shape.id, {
      contrast: shape.contrast ?? 1.0,
      saturation: shape.saturation ?? 1.0,
      brightness: shape.brightness ?? 1.0
    });
    
    // Also update WebGL rendering if available
    if (webglCanvasRef.current && programRef.current) {
      updateWebGL();
    }
  }, [shape.contrast, shape.saturation, shape.brightness, shape.id, updateShape, updateWebGL]);

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
