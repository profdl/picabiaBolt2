// src/hooks/shapes/useImageCanvas.ts
import { useRef, useEffect, useCallback, useMemo } from "react";
import { Shape } from "../../types";

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
      // Random noise value with higher minimum for brighter red
      const noise = 128 + Math.random() * 127; // This ensures red is always at least 128 (half brightness)
      
      // Set RGB values - using brighter red with some variation
      data[i] = noise;     // Red channel (now brighter)
      data[i + 1] = 0;     // Green channel
      data[i + 2] = 0;     // Blue channel
      data[i + 3] = 0;    // Alpha channel (more transparent, reduced from 50)
    }
    
    return imageData;
  };

  // Function to reapply mask with original dimensions
  const reapplyMask = useCallback(() => {
    const maskCanvas = refs.maskCanvasRef.current;
    const previewCanvas = refs.previewCanvasRef.current;
    if (!maskCanvas || !previewCanvas) return;

    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!maskCtx) return;

    // When using eraser, we don't want to reset the mask
    if (tool !== 'eraser') {
      // Ensure mask canvas maintains original dimensions
      maskCanvas.width = maskDimensionsRef.current.width;
      maskCanvas.height = maskDimensionsRef.current.height;

      // Clear and fill mask with white
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      maskCtx.fillStyle = 'white';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    }

    // Apply mask using CSS properties with proper scaling
    const maskDataUrl = maskCanvas.toDataURL();
    previewCanvas.style.webkitMaskImage = `url(${maskDataUrl})`;
    previewCanvas.style.maskImage = `url(${maskDataUrl})`;
    previewCanvas.style.webkitMaskSize = 'cover';
    previewCanvas.style.maskSize = 'cover';
    previewCanvas.style.webkitMaskPosition = 'center';
    previewCanvas.style.maskPosition = 'center';
  }, [refs.maskCanvasRef, refs.previewCanvasRef, tool]);

  // Export updatePreviewCanvas function
  const updatePreviewCanvas = useCallback(() => {
    if (!refs.previewCanvasRef.current || !refs.backgroundCanvasRef.current || !refs.permanentStrokesCanvasRef.current || !refs.activeStrokeCanvasRef.current || !refs.maskCanvasRef.current) return;

    const previewCtx = refs.previewCanvasRef.current.getContext("2d", { willReadFrequently: true });
    if (!previewCtx) return;

    // Clear preview canvas
    previewCtx.clearRect(0, 0, refs.previewCanvasRef.current.width, refs.previewCanvasRef.current.height);

    // Draw background
    previewCtx.drawImage(refs.backgroundCanvasRef.current, 0, 0);

    // Draw permanent strokes
    previewCtx.drawImage(refs.permanentStrokesCanvasRef.current, 0, 0);

    // Draw active stroke
    previewCtx.drawImage(refs.activeStrokeCanvasRef.current, 0, 0);

    // Apply mask
    previewCtx.globalCompositeOperation = "destination-in";
    previewCtx.drawImage(refs.maskCanvasRef.current, 0, 0);
    previewCtx.globalCompositeOperation = "source-over";
  }, [refs]);

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
        originalHeight: img.height
      });

      // Set canvas dimensions to match the image's aspect ratio
      const aspectRatio = img.width / img.height;
      const width = 512;
      const height = 512 / aspectRatio;

      console.log('Setting canvas dimensions:', {
        width,
        height,
        aspectRatio
      });

      // Set dimensions for all canvases
      [backgroundCanvas, permanentCanvas, activeCanvas, previewCanvas, maskCanvas, redBackgroundCanvas].forEach(canvas => {
        canvas.width = width;
        canvas.height = height;
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

      // If no saved mask data, create and apply the default mask
      if (!shape.maskCanvasData) {
        maskCtx.clearRect(0, 0, width, height);
        maskCtx.fillStyle = 'white';
        maskCtx.fillRect(0, 0, width, height);
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
  }, [shape.imageUrl, shape.maskCanvasData, refs]);

  return {
    refs,
    reapplyMask,
    updatePreviewCanvas,
    maskDimensionsRef
  };
};