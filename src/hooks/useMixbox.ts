
import {  useCallback } from 'react';
import Mixbox from 'mixbox';

interface MixboxBrushProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  strokeCanvasRef: React.RefObject<HTMLCanvasElement>;
  overlayCanvasRef: React.RefObject<HTMLCanvasElement>;
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
    const ctx = strokeCanvasRef.current?.getContext('2d');
    if (!ctx) return '#000000';
    
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    return rgbToHex(pixel[0], pixel[1], pixel[2]);
  }, [strokeCanvasRef]);

  return {
    mixColors,
    sampleColor,
    rgbToMixbox,
    mixboxToRgb
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

};
