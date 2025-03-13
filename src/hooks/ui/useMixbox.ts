
import {  useCallback } from 'react';
import Mixbox from 'mixbox';

interface MixboxBrushProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  strokeCanvasRef: React.RefObject<HTMLCanvasElement>;
  overlayCanvasRef: React.RefObject<HTMLCanvasElement>;
}

interface MixboxDrawProps {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  color: string;
  opacity: number;
  size: number;
}

interface StrokeLayer {
  canvas: HTMLCanvasElement;
  opacity: number;
  color: string;
}

export const useMixboxBrush = ({ strokeCanvasRef }: MixboxBrushProps) => {
  // Convert RGB color to Mixbox color
  const rgbToMixbox = useCallback((color: string) => {
    const rgb = hexToRgb(color);
    return Mixbox.rgbToLatent(rgb.r, rgb.g, rgb.b);
  }, []);

  // Convert Mixbox color back to RGB
  const mixboxToRgb = useCallback((latent: number[]) => {
    const [r, g, b] = Mixbox.latentToRgb(latent);
    return rgbToHex(r, g, b);
  }, []);

  // Mix colors using Mixbox
  const mixColors = useCallback((color1: string, color2: string, ratio: number) => {
    const latent1 = rgbToMixbox(color1);
    const latent2 = rgbToMixbox(color2);
    
    // Interpolate in latent space
    const mixedLatent = latent1.map((v: number, i: number) => 
      v * (1 - ratio) + latent2[i] * ratio
    );
    
    return mixboxToRgb(mixedLatent);
  }, [rgbToMixbox, mixboxToRgb]);

  // Sample color from canvas
  const sampleColor = useCallback((x: number, y: number): string => {
    const ctx = strokeCanvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (!ctx) return '#000000';
    
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    return rgbToHex(pixel[0], pixel[1], pixel[2]);
  }, [strokeCanvasRef]);

   // New function to mix with background considering opacity
   const mixWithBackground = useCallback((foregroundColor: string, x: number, y: number, opacity: number) => {
    // Get background color from stroke canvas
    const backgroundColor = sampleColor(x, y);
    
    // Convert colors to Mixbox space
    const foregroundLatent = rgbToMixbox(foregroundColor);
    const backgroundLatent = rgbToMixbox(backgroundColor);
    
    // Mix colors using opacity as ratio
    const mixedLatent = backgroundLatent.map((v: number, i: number) => 
      v * (1 - opacity) + foregroundLatent[i] * opacity
    );
    
    return mixboxToRgb(mixedLatent);
  }, [sampleColor, rgbToMixbox, mixboxToRgb]);



  const createStrokeLayer = useCallback((width: number, height: number): StrokeLayer => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    // Get context with willReadFrequently flag
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
    }
    return {
      canvas,
      opacity: 1,
      color: '#000000'
    };
  }, []);

  const blendLayers = useCallback((bottomLayer: StrokeLayer, topLayer: StrokeLayer, x: number, y: number) => {
    const bottomCtx = bottomLayer.canvas.getContext('2d', { willReadFrequently: true });
    const topCtx = topLayer.canvas.getContext('2d', { willReadFrequently: true });
    if (!bottomCtx || !topCtx) return;

    const bottomPixel = bottomCtx.getImageData(x, y, 1, 1).data;
    const topPixel = topCtx.getImageData(x, y, 1, 1).data;

    // Calculate effective opacity considering both layer and pixel alpha
    const effectiveOpacity = (topPixel[3] / 255) * topLayer.opacity;
    
    if (effectiveOpacity === 0) return bottomLayer.color;

    const bottomColor = rgbToHex(bottomPixel[0], bottomPixel[1], bottomPixel[2]);
    const topColor = topLayer.color;

    // Mix colors using Mixbox with effective opacity
    const bottomLatent = rgbToMixbox(bottomColor);
    const topLatent = rgbToMixbox(topColor);
    
    const mixedLatent = bottomLatent.map((v: number, i: number) => 
      v * (1 - effectiveOpacity) + topLatent[i] * effectiveOpacity
    );
    
    return mixboxToRgb(mixedLatent);
  }, [rgbToMixbox, mixboxToRgb]);

  const drawMixboxStamp = useCallback(({ ctx, x, y, color, opacity, size }: MixboxDrawProps) => {
    // Create temporary layers for blending
    const currentLayer = createStrokeLayer(size, size);
    const backgroundLayer = createStrokeLayer(size, size);
    
    // Copy background area to background layer
    const bgCtx = backgroundLayer.canvas.getContext('2d');
    if (bgCtx) {
      bgCtx.drawImage(
        strokeCanvasRef.current!, 
        x - size/2, y - size/2, size, size,
        0, 0, size, size
      );
    }

    // Draw stamp on current layer
    const stampCtx = currentLayer.canvas.getContext('2d');
    if (stampCtx) {
      stampCtx.fillStyle = color;
      stampCtx.fillRect(0, 0, size, size);
    }

    // Set layer properties
    currentLayer.color = color;
    currentLayer.opacity = opacity;
    backgroundLayer.color = sampleColor(x, y);
    
    // Blend layers
    const blendedColor = blendLayers(backgroundLayer, currentLayer, size/2, size/2);
    
    // Draw final result
    if (blendedColor) {
      ctx.fillStyle = blendedColor;
    }
    ctx.fillRect(x - size/2, y - size/2, size, size);
  }, [createStrokeLayer, blendLayers, sampleColor, strokeCanvasRef]);


  return {
    mixColors,
    sampleColor,
    rgbToMixbox,
    mixboxToRgb,
    mixWithBackground,
    drawMixboxStamp,
    createStrokeLayer,
    blendLayers
  };
};


  
function hexToRgb(color: string) {
  if (color.startsWith('#')) {
    color = color.slice(1);
  }

  if (color.length === 3) {
    color = color.split('').map(char => char + char).join('');
  }

  const num = parseInt(color, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${((r << 16) + (g << 8) + b).toString(16).padStart(6, '0')}`;
}

