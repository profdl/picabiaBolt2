import { Point } from './imageShapeCanvas';

export type BrushTextureType = 'soft' | 'basic' | 'fur' | 'ink' | 'marker';

interface BrushTextureOptions {
  size: number;
  color: string;
  hardness: number;
  rotation: number;
  followPath: boolean;
  pathAngle?: number;
  spacing?: number;
}

interface BrushTextureContext {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
}

// Cache for loaded brush textures
const brushTextures = new Map<string, HTMLImageElement>();

// Preload brush textures
export const preloadBrushTextures = () => {
  const BRUSH_TEXTURES: BrushTextureType[] = ["basic", "fur", "ink", "marker"];
  BRUSH_TEXTURES.forEach((texture) => {
    if (!brushTextures.has(texture)) {
      const img = new Image();
      img.src = `/brushes/${texture}.png`;
      img.onload = () => {
        brushTextures.set(texture, img);
      };
    }
  });
};

// Create a temporary canvas for brush stamp
const createBrushStampCanvas = (size: number): HTMLCanvasElement | null => {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = size;
  tempCanvas.height = size;
  return tempCanvas;
};

// Apply soft brush texture using radial gradient
const applySoftBrushTexture = (
  ctx: CanvasRenderingContext2D,
  size: number,
  hardness: number
) => {
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  
  const hardnessFactor = 1 - Math.max(0.01, hardness);
  
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(Math.min(1, 1 - hardnessFactor), 'rgba(255,255,255,0.5)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
};

// Apply texture image as mask
const applyTextureImageMask = (
  ctx: CanvasRenderingContext2D,
  texture: BrushTextureType,
  size: number
) => {
  const textureImg = brushTextures.get(texture);
  if (textureImg && textureImg.complete) {
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(textureImg, 0, 0, size, size);
  }
};

// Draw a single brush stamp
export const drawBrushStamp = (
  { ctx, x, y }: BrushTextureContext,
  { size, color, hardness, rotation, followPath, pathAngle }: BrushTextureOptions,
  texture: BrushTextureType,
  drawColor: (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size: number) => void
) => {
  const tempCanvas = createBrushStampCanvas(size);
  if (!tempCanvas) return;

  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!tempCtx) return;

  // Get the scale of the canvas
  const canvas = ctx.canvas;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  // Scale the brush size according to the canvas scale
  const scaledSize = size * Math.max(scaleX, scaleY);

  // Draw the color using the provided drawColor function
  drawColor(tempCtx, size / 2, size / 2, color, size);

  // Apply texture mask
  if (texture === 'soft') {
    applySoftBrushTexture(tempCtx, size, hardness);
  } else {
    applyTextureImageMask(tempCtx, texture, size);
  }

  // Draw the final result with rotation
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(followPath ? (pathAngle || 0) : (rotation * Math.PI) / 180);
  ctx.drawImage(tempCanvas, -scaledSize / 2, -scaledSize / 2, scaledSize, scaledSize);
  ctx.restore();
};

// Draw a brush stroke between two points
export const drawBrushStroke = (
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  options: BrushTextureOptions,
  texture: BrushTextureType,
  drawColor: (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size: number) => void
) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const spacing = Math.max(options.size * (options.spacing ?? 0.5), 1);
  const steps = Math.ceil(distance / spacing);
  const pathAngle = Math.atan2(dy, dx);

  // Calculate the actual spacing to ensure even distribution
  const actualSpacing = distance / steps;

  for (let i = 0; i <= steps; i++) {
    const t = (i * actualSpacing) / distance;
    const x = start.x + dx * t;
    const y = start.y + dy * t;

    drawBrushStamp(
      { ctx, x, y },
      { ...options, pathAngle },
      texture,
      drawColor
    );
  }
}; 