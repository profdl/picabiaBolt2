// src/hooks/shapes/useImageCanvas.ts
import { useRef, useEffect, useCallback, useMemo } from "react";
import { Shape } from "../../types";
import { useStore } from "../../store";

export interface ImageCanvasRefs {
  backgroundCanvasRef: React.RefObject<HTMLCanvasElement>;
  permanentStrokesCanvasRef: React.RefObject<HTMLCanvasElement>;
  activeStrokeCanvasRef: React.RefObject<HTMLCanvasElement>;
  previewCanvasRef: React.RefObject<HTMLCanvasElement>;
  maskCanvasRef: React.RefObject<HTMLCanvasElement>;
  redBackgroundCanvasRef: React.RefObject<HTMLCanvasElement>;
}

interface UseImageCanvasProps {
  shape: Shape;
  tool: "select" | "pan" | "pen" | "brush" | "eraser";
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
  const redBackgroundCanvasRef = useRef<HTMLCanvasElement>(null);

  // Memoize the refs object
  const refs = useMemo(() => ({
    backgroundCanvasRef,
    permanentStrokesCanvasRef,
    activeStrokeCanvasRef,
    previewCanvasRef,
    maskCanvasRef,
    redBackgroundCanvasRef,
  }), []); // Empty dependency array since refs are stable

  // Store the initial mask dimensions
  const maskDimensionsRef = useRef<{ width: number; height: number; gradient: CanvasGradient | null }>({
    width: 0,
    height: 0,
    gradient: null
  });

  // Add cache ref for preview during scaling
  const cachedPreview = useRef<HTMLCanvasElement | null>(null);

  const generateNoise = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Generate noise with higher contrast
      const noise = 64 + Math.random() * 191; // Range from 64 to 255 for better visibility
      
      // Set RGB values - using red with some variation
      data[i] = noise;     // Red channel
      data[i + 1] = 0;     // Green channel
      data[i + 2] = 0;     // Blue channel
      data[i + 3] = 255;   // Full opacity (will be controlled by CSS)
    }
    
    return imageData;
  };

  // Optimized updatePreviewCanvas function
  const updatePreviewCanvas = useCallback(() => {
    if (!refs.previewCanvasRef.current || !refs.backgroundCanvasRef.current || 
        !refs.permanentStrokesCanvasRef.current || !refs.activeStrokeCanvasRef.current || 
        !refs.maskCanvasRef.current) return;

    const previewCtx = refs.previewCanvasRef.current.getContext("2d", { willReadFrequently: true });
    if (!previewCtx) return;

    const previewCanvas = refs.previewCanvasRef.current;
    const width = previewCanvas.width;
    const height = previewCanvas.height;

    // Clear preview canvas
    previewCtx.clearRect(0, 0, width, height);

    // Enable image smoothing for better quality during scaling
    previewCtx.imageSmoothingEnabled = true;
    previewCtx.imageSmoothingQuality = 'high';

    if (isScaling.current) {
      // If we don't have a cached preview, create one from the current state
      if (!cachedPreview.current) {
        cachedPreview.current = document.createElement('canvas');
        cachedPreview.current.width = refs.previewCanvasRef.current.width;
        cachedPreview.current.height = refs.previewCanvasRef.current.height;
        const cacheCtx = cachedPreview.current.getContext('2d', { willReadFrequently: true });
        if (cacheCtx) {
          // Draw all layers in a single operation
          cacheCtx.drawImage(refs.backgroundCanvasRef.current, 0, 0);
          cacheCtx.drawImage(refs.permanentStrokesCanvasRef.current, 0, 0);
          cacheCtx.drawImage(refs.activeStrokeCanvasRef.current, 0, 0);
        }
      }

      // Use a single draw operation for the cached preview
      previewCtx.drawImage(
        cachedPreview.current,
        0, 0, cachedPreview.current.width, cachedPreview.current.height,
        0, 0, width, height
      );

      // Update CSS mask during scaling
      const maskDataUrl = refs.maskCanvasRef.current?.toDataURL();
      if (maskDataUrl) {
        previewCanvas.style.webkitMaskImage = `url(${maskDataUrl})`;
        previewCanvas.style.maskImage = `url(${maskDataUrl})`;
        previewCanvas.style.webkitMaskSize = `${width}px ${height}px`;
        previewCanvas.style.maskSize = `${width}px ${height}px`;
        previewCanvas.style.webkitMaskPosition = 'center';
        previewCanvas.style.maskPosition = 'center';
      }

      return;
    }

    // Clear cache when not scaling
    cachedPreview.current = null;

    // Normal update (not scaling) - use a single requestAnimationFrame
    requestAnimationFrame(() => {
      // Draw all layers in a single operation with null checks
      if (refs.backgroundCanvasRef.current) {
        previewCtx.drawImage(
          refs.backgroundCanvasRef.current as CanvasImageSource,
          0, 0, width, height
        );
      }
      if (refs.permanentStrokesCanvasRef.current) {
        previewCtx.drawImage(
          refs.permanentStrokesCanvasRef.current as CanvasImageSource,
          0, 0, width, height
        );
      }
      if (refs.activeStrokeCanvasRef.current) {
        previewCtx.drawImage(
          refs.activeStrokeCanvasRef.current as CanvasImageSource,
          0, 0, width, height
        );
      }

      // Update CSS mask
      const maskDataUrl = refs.maskCanvasRef.current?.toDataURL();
      if (maskDataUrl) {
        previewCanvas.style.webkitMaskImage = `url(${maskDataUrl})`;
        previewCanvas.style.maskImage = `url(${maskDataUrl})`;
        previewCanvas.style.webkitMaskSize = `${width}px ${height}px`;
        previewCanvas.style.maskSize = `${width}px ${height}px`;
        previewCanvas.style.webkitMaskPosition = 'center';
        previewCanvas.style.maskPosition = 'center';
      }
    });
  }, [refs, isScaling]);

  // Throttled version of updatePreviewCanvas
  const throttledUpdatePreview = useCallback(() => {
    let inThrottle = false;
    return () => {
      if (!inThrottle) {
        updatePreviewCanvas();
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, 16);
      }
    };
  }, [updatePreviewCanvas]);

  const updateMaskScaling = useCallback(() => {
    if (!refs.maskCanvasRef.current || !refs.previewCanvasRef.current) return;
    
    const maskCanvas = refs.maskCanvasRef.current;
    const previewCanvas = refs.previewCanvasRef.current;
    
    // Create a temporary canvas to store the current mask content
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = maskCanvas.width;
    tempCanvas.height = maskCanvas.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) return;
    
    // Copy current mask content to temp canvas
    tempCtx.drawImage(maskCanvas, 0, 0);
    
    // Update mask dimensions to match preview
    maskCanvas.width = previewCanvas.width;
    maskCanvas.height = previewCanvas.height;
    
    // Get new mask context
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!maskCtx) return;
    
    // Enable image smoothing for better quality during scaling
    maskCtx.imageSmoothingEnabled = true;
    maskCtx.imageSmoothingQuality = 'high';
    
    // Draw the stored mask content scaled to new dimensions in a single operation
    maskCtx.drawImage(
      tempCanvas,
      0, 0, tempCanvas.width, tempCanvas.height,
      0, 0, maskCanvas.width, maskCanvas.height
    );
    
    // Apply mask with proper scaling using CSS
    const maskDataUrl = maskCanvas.toDataURL();
    previewCanvas.style.webkitMaskImage = `url(${maskDataUrl})`;
    previewCanvas.style.maskImage = `url(${maskDataUrl})`;
    previewCanvas.style.webkitMaskSize = `${maskCanvas.width}px ${maskCanvas.height}px`;
    previewCanvas.style.maskSize = `${maskCanvas.width}px ${maskCanvas.height}px`;
    previewCanvas.style.webkitMaskPosition = 'center';
    previewCanvas.style.maskPosition = 'center';
  }, [refs.maskCanvasRef, refs.previewCanvasRef]);

  const handleScaleStart = useCallback(() => {
    isScaling.current = true;
    tempCanvasRef.current = null; // Reset temp canvas
    // Use requestAnimationFrame to ensure smooth start
    requestAnimationFrame(() => {
      updateMaskScaling();
      throttledUpdatePreview();
    });
  }, [throttledUpdatePreview, updateMaskScaling]);

  const handleScaleEnd = useCallback(() => {
    isScaling.current = false;
    tempCanvasRef.current = null;
    
    // Save mask state after scaling
    if (refs.maskCanvasRef.current) {
      const maskData = refs.maskCanvasRef.current.toDataURL('image/png');
      localStorage.setItem(`mask_${shape.id}`, maskData);
      updateShape(shape.id, { maskCanvasData: maskData });
      
      // Reapply mask with proper CSS masking and scaling
      const previewCanvas = refs.previewCanvasRef.current;
      if (previewCanvas) {
        previewCanvas.style.webkitMaskImage = `url(${maskData})`;
        previewCanvas.style.maskImage = `url(${maskData})`;
        previewCanvas.style.webkitMaskSize = `${previewCanvas.width}px ${previewCanvas.height}px`;
        previewCanvas.style.maskSize = `${previewCanvas.width}px ${previewCanvas.height}px`;
        previewCanvas.style.webkitMaskPosition = 'center';
        previewCanvas.style.maskPosition = 'center';
      }
    }
    
    requestAnimationFrame(() => {
      updatePreviewCanvas();
    });
  }, [updatePreviewCanvas, refs.maskCanvasRef, refs.previewCanvasRef, shape.id, updateShape]);

  // Add effect to handle drag and scale state
  useEffect(() => {
    const handleDragStart = () => {
      isDragging.current = true;
      throttledUpdatePreview();
    };

    const handleDragEnd = () => {
      isDragging.current = false;
      updatePreviewCanvas();
    };

    const handleMouseUp = () => {
      // Save mask data to both localStorage and shape state if using eraser tool
      if (tool === 'eraser' && refs.maskCanvasRef.current) {
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
  }, [handleScaleStart, handleScaleEnd, tool, shape.id, refs, updateShape, throttledUpdatePreview, updatePreviewCanvas]);

  // Function to reapply mask with original dimensions
  const reapplyMask = useCallback(() => {
    const maskCanvas = refs.maskCanvasRef.current;
    const previewCanvas = refs.previewCanvasRef.current;
    if (!maskCanvas || !previewCanvas) return;

    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!maskCtx) return;

    // Only reset the mask when switching away from both brush and eraser tools
    if (tool !== 'brush' && tool !== 'eraser') {
      // Use current shape dimensions instead of stored dimensions
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

    // Apply mask using CSS properties with proper scaling
    const maskDataUrl = maskCanvas.toDataURL();
    previewCanvas.style.webkitMaskImage = `url(${maskDataUrl})`;
    previewCanvas.style.maskImage = `url(${maskDataUrl})`;
    previewCanvas.style.webkitMaskSize = 'cover';
    previewCanvas.style.maskSize = 'cover';
    previewCanvas.style.webkitMaskPosition = 'center';
    previewCanvas.style.maskPosition = 'center';
  }, [refs.maskCanvasRef, refs.previewCanvasRef, tool, shape.width, shape.height, shape.id, updateShape]);

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
      const redBackgroundCanvas = refs.redBackgroundCanvasRef.current;

      if (!backgroundCanvas || !permanentCanvas || !activeCanvas || !previewCanvas || !maskCanvas || !redBackgroundCanvas) return;

      // Set dimensions for all canvases
      [backgroundCanvas, permanentCanvas, activeCanvas, previewCanvas, maskCanvas, redBackgroundCanvas].forEach(canvas => {
        canvas.width = width;
        canvas.height = height;
      });

      // Get contexts
      const backgroundCtx = backgroundCanvas.getContext("2d", { willReadFrequently: true });
      const permanentCtx = permanentCanvas.getContext("2d", { willReadFrequently: true });
      const activeCtx = activeCanvas.getContext("2d", { willReadFrequently: true });
      const previewCtx = previewCanvas.getContext("2d", { willReadFrequently: true });
      const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
      const redBackgroundCtx = redBackgroundCanvas.getContext("2d", { willReadFrequently: true });

      if (!backgroundCtx || !permanentCtx || !activeCtx || !previewCtx || !maskCtx || !redBackgroundCtx) return;

      // Draw background
      backgroundCtx.drawImage(img, 0, 0, width, height);

      // Generate noise for red background
      const noisePattern = generateNoise(redBackgroundCtx, width, height);
      redBackgroundCtx.putImageData(noisePattern, 0, 0);

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

  useEffect(() => {
    // Only reset mask when explicitly switching from eraser to brush
    if (tool === "brush" && previousTool.current === "eraser" && refs.maskCanvasRef.current) {
      const maskCtx = refs.maskCanvasRef.current.getContext("2d", { willReadFrequently: true });
      if (maskCtx) {
        maskCtx.clearRect(0, 0, refs.maskCanvasRef.current.width, refs.maskCanvasRef.current.height);
        maskCtx.fillStyle = 'white';
        maskCtx.fillRect(0, 0, refs.maskCanvasRef.current.width, refs.maskCanvasRef.current.height);
      }
      updatePreviewCanvas();
    }
    previousTool.current = tool;
  }, [tool, refs.maskCanvasRef, updatePreviewCanvas]);

  return {
    refs,
    reapplyMask,
    updatePreviewCanvas: throttledUpdatePreview,
    maskDimensionsRef,
    isDragging,
    isScaling,
  };
};