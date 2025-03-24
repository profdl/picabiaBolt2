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

  // Define updatePreviewCanvas first
  const updatePreviewCanvas = useCallback(() => {
    if (!refs.previewCanvasRef.current || !refs.backgroundCanvasRef.current || 
        !refs.permanentStrokesCanvasRef.current || !refs.activeStrokeCanvasRef.current || 
        !refs.maskCanvasRef.current) return;

    const previewCtx = refs.previewCanvasRef.current.getContext("2d", { willReadFrequently: true });
    if (!previewCtx) return;

    // During drag, update both CSS mask properties and draw permanent strokes
    if (isDragging.current) {
      // Clear preview canvas
      previewCtx.clearRect(0, 0, refs.previewCanvasRef.current.width, refs.previewCanvasRef.current.height);
      
      // Draw background and permanent strokes
      previewCtx.drawImage(refs.backgroundCanvasRef.current as CanvasImageSource, 0, 0);
      previewCtx.drawImage(refs.permanentStrokesCanvasRef.current as CanvasImageSource, 0, 0);

      // Apply mask
      const maskDataUrl = refs.maskCanvasRef.current.toDataURL();
      if (maskDataUrl) {
        refs.previewCanvasRef.current.style.webkitMaskImage = `url(${maskDataUrl})`;
        refs.previewCanvasRef.current.style.maskImage = `url(${maskDataUrl})`;
        refs.previewCanvasRef.current.style.webkitMaskSize = 'cover';
        refs.previewCanvasRef.current.style.maskSize = 'cover';
        refs.previewCanvasRef.current.style.webkitMaskPosition = 'center';
        refs.previewCanvasRef.current.style.maskPosition = 'center';
      }
      return;
    }

    // Use requestAnimationFrame for smoother updates when not dragging
    requestAnimationFrame(() => {
      const previewCanvas = refs.previewCanvasRef.current;
      if (!previewCanvas) return;

      // Clear preview canvas
      previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

      // Draw all layers
      previewCtx.drawImage(refs.backgroundCanvasRef.current as CanvasImageSource, 0, 0);
      previewCtx.drawImage(refs.permanentStrokesCanvasRef.current as CanvasImageSource, 0, 0);
      previewCtx.drawImage(refs.activeStrokeCanvasRef.current as CanvasImageSource, 0, 0);

      // Apply mask
      previewCtx.globalCompositeOperation = "destination-in";
      previewCtx.drawImage(refs.maskCanvasRef.current as CanvasImageSource, 0, 0);
      previewCtx.globalCompositeOperation = "source-over";

      // Apply CSS mask
      const maskDataUrl = refs.maskCanvasRef.current?.toDataURL();
      if (maskDataUrl) {
        previewCanvas.style.webkitMaskImage = `url(${maskDataUrl})`;
        previewCanvas.style.maskImage = `url(${maskDataUrl})`;
        previewCanvas.style.webkitMaskSize = 'cover';
        previewCanvas.style.maskSize = 'cover';
        previewCanvas.style.webkitMaskPosition = 'center';
        previewCanvas.style.maskPosition = 'center';
      }
    });
  }, [refs, isDragging]);

  // Add effect to handle drag state
  useEffect(() => {
    const saveCanvasState = (canvas: HTMLCanvasElement, prefix: string) => {
      if (canvas) {
        const data = canvas.toDataURL('image/png');
        localStorage.setItem(`${prefix}_${shape.id}_temp`, data);
      }
    };

    const restoreCanvasState = async (canvas: HTMLCanvasElement, prefix: string) => {
      if (canvas) {
        const savedData = localStorage.getItem(`${prefix}_${shape.id}_temp`);
        if (savedData) {
          const img = new Image();
          await new Promise((resolve) => {
            img.onload = () => {
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
              }
              resolve(null);
            };
            img.src = savedData;
          });
        }
      }
    };

    const handleDragStart = async () => {
      isDragging.current = true;
      
      // Save all canvas states before drag starts
      if (refs.backgroundCanvasRef.current) saveCanvasState(refs.backgroundCanvasRef.current, 'background');
      if (refs.permanentStrokesCanvasRef.current) saveCanvasState(refs.permanentStrokesCanvasRef.current, 'permanent');
      if (refs.activeStrokeCanvasRef.current) saveCanvasState(refs.activeStrokeCanvasRef.current, 'active');
      if (refs.maskCanvasRef.current) saveCanvasState(refs.maskCanvasRef.current, 'mask');
      
      // Force one final preview update before starting drag
      updatePreviewCanvas();
    };

    const handleDragEnd = async () => {
      isDragging.current = false;
      
      // Restore all canvas states after drag ends
      if (refs.backgroundCanvasRef.current) await restoreCanvasState(refs.backgroundCanvasRef.current, 'background');
      if (refs.permanentStrokesCanvasRef.current) await restoreCanvasState(refs.permanentStrokesCanvasRef.current, 'permanent');
      if (refs.activeStrokeCanvasRef.current) await restoreCanvasState(refs.activeStrokeCanvasRef.current, 'active');
      if (refs.maskCanvasRef.current) await restoreCanvasState(refs.maskCanvasRef.current, 'mask');
      
      // Clean up temporary storage
      ['background', 'permanent', 'active', 'mask'].forEach(prefix => {
        localStorage.removeItem(`${prefix}_${shape.id}_temp`);
      });
      
      // Update preview after drag ends
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

    return () => {
      window.removeEventListener('mousedown', handleDragStart);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('mouseup', handleMouseUp);
      // Clean up temporary storage on unmount
      ['background', 'permanent', 'active', 'mask'].forEach(prefix => {
        localStorage.removeItem(`${prefix}_${shape.id}_temp`);
      });
    };
  }, [updatePreviewCanvas, tool, shape.id, refs, updateShape]);

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
  }, [shape.imageUrl, shape.width, shape.height, shape.id, shape.maskCanvasData, refs, updateShape]);

  return {
    refs,
    reapplyMask,
    updatePreviewCanvas,
    maskDimensionsRef
  };
};