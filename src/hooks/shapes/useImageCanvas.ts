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

  // Initialize canvases with image
  useEffect(() => {
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
    img.onload = () => {
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

      // Create and apply the mask
      maskCtx.clearRect(0, 0, width, height);
      
      // Fill mask with white to make image fully visible initially
      maskCtx.fillStyle = 'white';
      maskCtx.fillRect(0, 0, width, height);
      
      // Store the initial dimensions (without gradient)
      maskDimensionsRef.current = {
        width,
        height,
        gradient: null
      };
      
      console.log('Mask canvas drawn');

      // Clear preview canvas
      previewCtx.clearRect(0, 0, width, height);
      
      // Draw the background image to preview canvas
      previewCtx.save();
      previewCtx.drawImage(backgroundCanvas, 0, 0);
      previewCtx.restore();
      
      // Apply the initial mask using CSS
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
  }, [shape.imageUrl, refs]);

  return {
    refs,
    reapplyMask,
    maskDimensionsRef
  };
};