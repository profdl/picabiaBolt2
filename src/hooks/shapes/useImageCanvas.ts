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

type CanvasLayer = 'background' | 'permanent' | 'active' | 'preview' | 'mask' | 'redBackground';

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

    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
      const previewCanvas = refs.previewCanvasRef.current;
      if (!previewCanvas) return;

      // Clear preview canvas
      previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

      // Draw background
      previewCtx.drawImage(refs.backgroundCanvasRef.current as CanvasImageSource, 0, 0);

      // Draw permanent strokes
      previewCtx.drawImage(refs.permanentStrokesCanvasRef.current as CanvasImageSource, 0, 0);

      // Draw active stroke
      previewCtx.drawImage(refs.activeStrokeCanvasRef.current as CanvasImageSource, 0, 0);

      // Apply mask
      previewCtx.globalCompositeOperation = "destination-in";
      previewCtx.drawImage(refs.maskCanvasRef.current as CanvasImageSource, 0, 0);
      previewCtx.globalCompositeOperation = "source-over";
      // Apply CSS mask
      const maskDataUrl = refs.maskCanvasRef.current?.toDataURL() || '';
      previewCanvas.style.webkitMaskImage = `url(${maskDataUrl})`;
      previewCanvas.style.maskImage = `url(${maskDataUrl})`;
      previewCanvas.style.webkitMaskSize = 'cover';
      previewCanvas.style.maskSize = 'cover';
      previewCanvas.style.webkitMaskPosition = 'center';
      previewCanvas.style.maskPosition = 'center';
    });
  }, [refs]);

  // Add effect to handle drag state
  useEffect(() => {
    const handleDragStart = () => {
      isDragging.current = true;
      // Save current mask state before drag starts
      if (refs.maskCanvasRef.current) {
        const maskData = refs.maskCanvasRef.current.toDataURL('image/png');
        localStorage.setItem(`mask_${shape.id}_temp`, maskData);
      }
    };

    const handleDragEnd = () => {
      isDragging.current = false;
      // Restore mask state after drag ends
      if (refs.maskCanvasRef.current) {
        const savedMaskData = localStorage.getItem(`mask_${shape.id}_temp`);
        if (savedMaskData) {
          const maskImg = new Image();
          maskImg.onload = () => {
            const maskCtx = refs.maskCanvasRef.current?.getContext('2d', { willReadFrequently: true });
            if (maskCtx && refs.maskCanvasRef.current) {
              maskCtx.clearRect(0, 0, refs.maskCanvasRef.current.width, refs.maskCanvasRef.current.height);
              maskCtx.drawImage(maskImg, 0, 0);
            }
          };
          maskImg.src = savedMaskData;
        }
        // Clean up temporary storage
        localStorage.removeItem(`mask_${shape.id}_temp`);
      }
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
      localStorage.removeItem(`mask_${shape.id}_temp`);
    };
  }, [updatePreviewCanvas, tool, shape.id, refs.maskCanvasRef, updateShape]);

  // Function to reapply mask with original dimensions
  const reapplyMask = useCallback(() => {
    const maskCanvas = refs.maskCanvasRef.current;
    const previewCanvas = refs.previewCanvasRef.current;
    if (!maskCanvas || !previewCanvas) return;

    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!maskCtx) return;

    // When using eraser, we don't want to reset the mask
    if (tool !== 'eraser') {
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

    console.log('ImageShape initialization started:', {
      hasImageUrl: !!shape.imageUrl,
      canvasRefs: {
        background: !!refs.backgroundCanvasRef.current,
        permanent: !!refs.permanentStrokesCanvasRef.current,
        active: !!refs.activeStrokeCanvasRef.current,
        preview: !!refs.previewCanvasRef.current,
        mask: !!refs.maskCanvasRef.current,
        redBackground: !!refs.redBackgroundCanvasRef.current
      }
    });

    if (!refs.backgroundCanvasRef.current || !refs.permanentStrokesCanvasRef.current || 
        !refs.activeStrokeCanvasRef.current || !refs.previewCanvasRef.current || 
        !refs.maskCanvasRef.current || !refs.redBackgroundCanvasRef.current || !shape.imageUrl) return;

    const backgroundCanvas = refs.backgroundCanvasRef.current;
    const permanentCanvas = refs.permanentStrokesCanvasRef.current;
    const activeCanvas = refs.activeStrokeCanvasRef.current;
    const previewCanvas = refs.previewCanvasRef.current;
    const maskCanvas = refs.maskCanvasRef.current;
    const redBackgroundCanvas = refs.redBackgroundCanvasRef.current;
    
    const bgCtx = backgroundCanvas.getContext('2d', { willReadFrequently: true });
    const permanentCtx = permanentCanvas.getContext('2d', { willReadFrequently: true });
    const activeCtx = activeCanvas.getContext('2d', { willReadFrequently: true });
    const previewCtx = previewCanvas.getContext('2d', { willReadFrequently: true });
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    const redBgCtx = redBackgroundCanvas.getContext('2d', { willReadFrequently: true });
    
    if (!bgCtx || !permanentCtx || !activeCtx || !previewCtx || !maskCtx || !redBgCtx) return;

    // Clear all canvases first
    [backgroundCanvas, permanentCanvas, activeCanvas, previewCanvas, maskCanvas, redBackgroundCanvas].forEach(canvas => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    // Load and draw the image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      if (!isMounted) return;

      console.log('Image loaded:', {
        originalWidth: img.width,
        originalHeight: img.height,
        shapeWidth: shape.width,
        shapeHeight: shape.height,
        shapeAspectRatio: shape.width / shape.height,
        imageAspectRatio: img.width / img.height
      });

      // Use shape's actual dimensions for canvas size
      const width = shape.width;
      const height = shape.height;

      console.log('Setting canvas dimensions:', {
        width,
        height,
        aspectRatio: img.width / img.height,
        devicePixelRatio: window.devicePixelRatio || 1
      });

      // Set dimensions for all canvases
      [backgroundCanvas, permanentCanvas, activeCanvas, previewCanvas, maskCanvas, redBackgroundCanvas].forEach(canvas => {
        canvas.width = width;
        canvas.height = height;
        console.log(`Canvas ${canvas.dataset.layer} dimensions set to:`, {
          width: canvas.width,
          height: canvas.height,
          styleWidth: canvas.style.width,
          styleHeight: canvas.style.height
        });
      });

      // Fill red background canvas with noise
      const noisePattern = generateNoise(redBgCtx, width, height);
      redBgCtx.putImageData(noisePattern, 0, 0);

      // Draw image on background canvas
      if (!bgCtx || !previewCtx || !permanentCtx || !maskCtx) return;

      bgCtx.drawImage(img, 0, 0, width, height);
      console.log('Background canvas drawn');

      // Load saved canvas data if available
      const canvasLayers: CanvasLayer[] = ['background', 'permanent', 'active', 'preview', 'mask', 'redBackground'];
      for (const layer of canvasLayers) {
        const canvasData = shape[`${layer}CanvasData` as keyof Shape];
        if (canvasData) {
          const layerImg = new Image();
          await new Promise((resolve) => {
            layerImg.onload = () => {
              if (!isMounted) return;
              
              const targetCanvas = {
                background: backgroundCanvas,
                permanent: permanentCanvas,
                active: activeCanvas,
                preview: previewCanvas,
                mask: maskCanvas,
                redBackground: redBackgroundCanvas
              }[layer];
              
              if (targetCanvas) {
                const targetCtx = targetCanvas.getContext('2d');
                if (targetCtx) {
                  targetCtx.drawImage(layerImg, 0, 0, width, height);
                }
              }
              resolve(null);
            };
            layerImg.src = canvasData as string;
          });
        }
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
      }

      // Store the initial dimensions (without gradient)
      maskDimensionsRef.current = {
        width,
        height,
        gradient: null
      };
      
      console.log('Mask canvas drawn');

      // Update preview canvas with all layers
      previewCtx.clearRect(0, 0, width, height);
      previewCtx.drawImage(backgroundCanvas, 0, 0);
      previewCtx.drawImage(permanentCanvas, 0, 0);
      
      // Apply the mask using CSS
      const maskDataUrl = maskCanvas.toDataURL();
      previewCanvas.style.webkitMaskImage = `url(${maskDataUrl})`;
      previewCanvas.style.maskImage = `url(${maskDataUrl})`;
      previewCanvas.style.webkitMaskSize = 'cover';
      previewCanvas.style.maskSize = 'cover';
      previewCanvas.style.webkitMaskPosition = 'center';
      previewCanvas.style.maskPosition = 'center';
      console.log('Preview canvas: background drawn and masked');
    };
    img.src = shape.imageUrl;

    return () => {
      isMounted = false;
    };
  }, [shape.imageUrl, shape.maskCanvasData, refs, shape, shape.id, updateShape]);

  return {
    refs,
    reapplyMask,
    updatePreviewCanvas,
    maskDimensionsRef
  };
};