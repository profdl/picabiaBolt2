// src/hooks/shapes/useImageCanvas.ts
import { useRef, useEffect, useCallback, useMemo } from "react";
import { ImageShape } from "../../types/shapes";
import { useStore } from "../../store";
import { ensureBinaryMask } from '../../utils/imageShapeCanvas';

export interface ImageCanvasRefs {
  backgroundCanvasRef: React.RefObject<HTMLCanvasElement>;
  permanentStrokesCanvasRef: React.RefObject<HTMLCanvasElement>;
  activeStrokeCanvasRef: React.RefObject<HTMLCanvasElement>;
  previewCanvasRef: React.RefObject<HTMLCanvasElement>;
  maskCanvasRef: React.RefObject<HTMLCanvasElement>;
}

interface UseImageCanvasProps {
  shape: ImageShape;
  tool: "select" | "pan" | "pen" | "brush" | "eraser" | "inpaint";
}

export const useImageCanvas = ({ shape, tool }: UseImageCanvasProps) => {
  // Add isDragging ref
  const isDragging = useRef(false);
  // Add isScaling ref
  const isScaling = useRef(false);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previousTool = useRef(tool);
  const updateShape = useStore((state) => state.updateShape);

  // Create individual refs
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const permanentStrokesCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeStrokeCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);

  // Memoize the refs object
  const refs = useMemo(() => ({
    backgroundCanvasRef,
    permanentStrokesCanvasRef,
    activeStrokeCanvasRef,
    previewCanvasRef,
    maskCanvasRef,
  }), []); // Empty dependency array since refs are stable

  // Store the initial mask dimensions
  const maskDimensionsRef = useRef<{ width: number; height: number; gradient: CanvasGradient | null }>({
    width: 0,
    height: 0,
    gradient: null
  });

  // Add cache ref for preview during scaling
  const cachedPreview = useRef<HTMLCanvasElement | null>(null);

  const updatePreviewCanvas = useCallback(() => {
    const previewCtx = refs.previewCanvasRef.current?.getContext('2d', { willReadFrequently: true });
    const previewCanvas = refs.previewCanvasRef.current;
    if (!previewCtx || !previewCanvas) return;

    const width = previewCanvas.width;
    const height = previewCanvas.height;

    // Clear preview
    previewCtx.clearRect(0, 0, width, height);

    if (isScaling.current) {
      // If we don't have a cached preview, create one from the current state
      if (!cachedPreview.current) {
        cachedPreview.current = document.createElement('canvas');
        cachedPreview.current.width = width;
        cachedPreview.current.height = height;
        const cacheCtx = cachedPreview.current.getContext('2d', { willReadFrequently: true });
        if (cacheCtx) {
          // Draw all layers in a single operation with null checks
          const backgroundCanvas = refs.backgroundCanvasRef.current;
          const permanentCanvas = refs.permanentStrokesCanvasRef.current;
          const activeCanvas = refs.activeStrokeCanvasRef.current;
          const maskCanvas = refs.maskCanvasRef.current;
          
          if (backgroundCanvas) {
            cacheCtx.drawImage(backgroundCanvas, 0, 0, width, height);
          }
          if (permanentCanvas) {
            cacheCtx.drawImage(permanentCanvas, 0, 0, width, height);
          }
          if (activeCanvas) {
            cacheCtx.drawImage(activeCanvas, 0, 0, width, height);
          }
          if (maskCanvas) {
            cacheCtx.globalCompositeOperation = 'destination-in';
            cacheCtx.drawImage(maskCanvas, 0, 0, width, height);
            cacheCtx.globalCompositeOperation = 'source-over';
          }
        }
      }

      // Use a single draw operation for the cached preview
      if (cachedPreview.current) {
        previewCtx.drawImage(
          cachedPreview.current,
          0, 0, cachedPreview.current.width, cachedPreview.current.height,
          0, 0, width, height
        );
      }

      return;
    }

    // Clear cache when not scaling
    cachedPreview.current = null;

    // Draw all layers in a single operation with null checks
    const backgroundCanvas = refs.backgroundCanvasRef.current;
    const permanentCanvas = refs.permanentStrokesCanvasRef.current;
    const activeCanvas = refs.activeStrokeCanvasRef.current;
    const maskCanvas = refs.maskCanvasRef.current;
    
    if (backgroundCanvas) {
      previewCtx.drawImage(backgroundCanvas, 0, 0, width, height);
    }
    if (permanentCanvas) {
      previewCtx.drawImage(permanentCanvas, 0, 0, width, height);
    }
    if (activeCanvas) {
      previewCtx.drawImage(activeCanvas, 0, 0, width, height);
    }
    if (maskCanvas) {
      previewCtx.globalCompositeOperation = 'destination-in';
      previewCtx.drawImage(maskCanvas, 0, 0, width, height);
      previewCtx.globalCompositeOperation = 'source-over';
    }
  }, [refs, isScaling]);

  const updateMaskScaling = useCallback(() => {
    if (!refs.maskCanvasRef.current || !refs.previewCanvasRef.current) return;
    
    const maskCanvas = refs.maskCanvasRef.current;
    const previewCanvas = refs.previewCanvasRef.current;
    
    // Update mask dimensions to match preview
    maskCanvas.width = previewCanvas.width;
    maskCanvas.height = previewCanvas.height;
    
    // Get mask context
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!maskCtx) return;
    
    // Enable image smoothing for better quality during scaling
    maskCtx.imageSmoothingEnabled = true;
    maskCtx.imageSmoothingQuality = 'high';
    
    // Clear the mask canvas
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    
    // If we have a temp canvas with the original mask, scale it
    if (tempCanvasRef.current) {
      maskCtx.drawImage(
        tempCanvasRef.current,
        0, 0, tempCanvasRef.current.width, tempCanvasRef.current.height,
        0, 0, maskCanvas.width, maskCanvas.height
      );
    } else {
      // If no temp canvas, fill with white (fully opaque)
      maskCtx.fillStyle = 'white';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    }

    // Ensure the mask is binary
    ensureBinaryMask(refs.maskCanvasRef);

    // Save the scaled mask state
    const maskData = maskCanvas.toDataURL('image/png');
    localStorage.setItem(`mask_${shape.id}`, maskData);
    updateShape(shape.id, { maskCanvasData: maskData });
  }, [refs.maskCanvasRef, refs.previewCanvasRef, shape.id, updateShape]);

  const handleScaleStart = useCallback(() => {
    isScaling.current = true;
    
    // Store current mask content in temp canvas
    if (refs.maskCanvasRef.current) {
      tempCanvasRef.current = document.createElement('canvas');
      tempCanvasRef.current.width = refs.maskCanvasRef.current.width;
      tempCanvasRef.current.height = refs.maskCanvasRef.current.height;
      const tempCtx = tempCanvasRef.current.getContext('2d', { willReadFrequently: true });
      if (tempCtx) {
        tempCtx.drawImage(refs.maskCanvasRef.current, 0, 0);
      }
    }
    
    updateMaskScaling();
    updatePreviewCanvas();
  }, [updateMaskScaling, updatePreviewCanvas, refs.maskCanvasRef]);

  const handleScaleEnd = useCallback(() => {
    isScaling.current = false;
    
    // Clean up temp canvas
    tempCanvasRef.current = null;
    updatePreviewCanvas();
  }, [updatePreviewCanvas]);

  // Add effect to handle drag and scale state
  useEffect(() => {
    const handleDragStart = () => {
      isDragging.current = true;
      updatePreviewCanvas();
    };

    const handleDragEnd = () => {
      isDragging.current = false;
      updatePreviewCanvas();
    };

    const handleMouseUp = () => {
      // Save mask data to both localStorage and shape state if using eraser or inpaint tool
      if ((tool === 'eraser' || tool === 'inpaint') && refs.maskCanvasRef.current) {
        // Ensure mask is binary before saving
        ensureBinaryMask(refs.maskCanvasRef);
        
        const maskData = refs.maskCanvasRef.current.toDataURL('image/png');
        localStorage.setItem(`mask_${shape.id}`, maskData);
        // Also update the shape state
        updateShape(shape.id, { maskCanvasData: maskData });
      }
    };

    window.addEventListener('mousedown', handleDragStart);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('mouseup', handleMouseUp);

    // Add scale event listeners
    window.addEventListener('shapeScalingStart', handleScaleStart);
    window.addEventListener('shapeScalingEnd', handleScaleEnd);

    return () => {
      window.removeEventListener('mousedown', handleDragStart);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('shapeScalingStart', handleScaleStart);
      window.removeEventListener('shapeScalingEnd', handleScaleEnd);
      // Clean up temporary storage on unmount
      ['background', 'permanent', 'active', 'mask'].forEach(prefix => {
        localStorage.removeItem(`${prefix}_${shape.id}_temp`);
      });
    };
  }, [handleScaleStart, handleScaleEnd, tool, shape.id, refs, updateShape, updatePreviewCanvas]);

  // Function to reapply mask with original dimensions
  const reapplyMask = useCallback(() => {
    const maskCanvas = refs.maskCanvasRef.current;
    const previewCanvas = refs.previewCanvasRef.current;
    if (!maskCanvas || !previewCanvas) return;

    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!maskCtx) return;

    // Only reset the mask when explicitly switching from eraser to brush
    if (tool === 'brush' && previousTool.current === 'eraser') {
      // Use current shape dimensions
      maskCanvas.width = shape.width;
      maskCanvas.height = shape.height;

      // Clear and fill mask with white
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      maskCtx.fillStyle = 'white';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

      // Clear saved mask data when resetting
      localStorage.removeItem(`mask_${shape.id}`);
      updateShape(shape.id, { maskCanvasData: undefined });
    }

    // Apply mask using canvas composite operations
    updatePreviewCanvas();
  }, [refs.maskCanvasRef, refs.previewCanvasRef, tool, shape.width, shape.height, shape.id, updateShape, updatePreviewCanvas]);

  // Track the previous tool to detect tool transitions
  useEffect(() => {
    previousTool.current = tool;
  }, [tool]);

  // Initialize canvases with image
  useEffect(() => {
    let isMounted = true;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = async () => {
      if (!isMounted) return;

      const width = shape.width;
      const height = shape.height;

      // Initialize all canvases with proper dimensions
      const backgroundCanvas = refs.backgroundCanvasRef.current;
      const permanentCanvas = refs.permanentStrokesCanvasRef.current;
      const activeCanvas = refs.activeStrokeCanvasRef.current;
      const previewCanvas = refs.previewCanvasRef.current;
      const maskCanvas = refs.maskCanvasRef.current;

      if (!backgroundCanvas || !permanentCanvas || !activeCanvas || !previewCanvas || !maskCanvas) return;

      // Set dimensions for all canvases
      [backgroundCanvas, permanentCanvas, activeCanvas, previewCanvas, maskCanvas].forEach(canvas => {
        canvas.width = width;
        canvas.height = height;
      });

      // Get contexts
      const backgroundCtx = backgroundCanvas.getContext("2d", { willReadFrequently: true });
      const permanentCtx = permanentCanvas.getContext("2d", { willReadFrequently: true });
      const activeCtx = activeCanvas.getContext("2d", { willReadFrequently: true });
      const previewCtx = previewCanvas.getContext("2d", { willReadFrequently: true });
      const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });

      if (!backgroundCtx || !permanentCtx || !activeCtx || !previewCtx || !maskCtx) return;

      // Draw background
      backgroundCtx.drawImage(img, 0, 0, width, height);

      // Handle permanent strokes initialization
      if (shape.permanentCanvasData) {
        const permanentImg = new Image();
        await new Promise((resolve) => {
          permanentImg.onload = () => {
            if (!isMounted) return;
            permanentCtx.clearRect(0, 0, width, height);
            permanentCtx.drawImage(permanentImg, 0, 0, width, height);
            resolve(null);
          };
          permanentImg.src = shape.permanentCanvasData as string;
        });
      } else {
        // Clear permanent strokes canvas
        permanentCtx.clearRect(0, 0, width, height);
      }

      // Handle mask initialization with proper priority
      if (!shape.maskCanvasData) {
        // First check localStorage
        const savedMaskData = localStorage.getItem(`mask_${shape.id}`);
        if (savedMaskData) {
          const maskImg = new Image();
          await new Promise((resolve) => {
            maskImg.onload = () => {
              if (!isMounted) return;
              maskCtx.clearRect(0, 0, width, height);
              maskCtx.drawImage(maskImg, 0, 0, width, height);
              // Update shape state with the loaded mask data
              updateShape(shape.id, { maskCanvasData: savedMaskData });
              resolve(null);
            };
            maskImg.src = savedMaskData;
          });
        } else {
          // If no saved data, create default mask
          maskCtx.clearRect(0, 0, width, height);
          maskCtx.fillStyle = 'white';
          maskCtx.fillRect(0, 0, width, height);
        }
      } else {
        // If we have mask data in the shape state, use that
        const maskImg = new Image();
        await new Promise((resolve) => {
          maskImg.onload = () => {
            if (!isMounted) return;
            maskCtx.clearRect(0, 0, width, height);
            maskCtx.drawImage(maskImg, 0, 0, width, height);
            resolve(null);
          };
          maskImg.src = shape.maskCanvasData as string;
        });
      }

      // Store the initial dimensions (without gradient)
      maskDimensionsRef.current = {
        width,
        height,
        gradient: null
      };

      // Update preview canvas with all layers
      previewCtx.clearRect(0, 0, width, height);
      previewCtx.drawImage(backgroundCanvas, 0, 0);
      previewCtx.drawImage(permanentCanvas, 0, 0);
      
      // Apply the mask using CSS
      const maskDataUrl = maskCanvas.toDataURL();
      if (maskDataUrl) {
        previewCanvas.style.webkitMaskImage = `url(${maskDataUrl})`;
        previewCanvas.style.maskImage = `url(${maskDataUrl})`;
        previewCanvas.style.webkitMaskSize = 'cover';
        previewCanvas.style.maskSize = 'cover';
        previewCanvas.style.webkitMaskPosition = 'center';
        previewCanvas.style.maskPosition = 'center';
      }
    };
    img.src = shape.imageUrl as string;

    return () => {
      isMounted = false;
    };
  }, [shape.imageUrl, shape.width, shape.height, shape.id, shape.maskCanvasData, refs, updateShape, shape.permanentCanvasData]);

  return {
    refs,
    reapplyMask,
    updatePreviewCanvas,
    maskDimensionsRef,
    isDragging,
    isScaling,
  };
};