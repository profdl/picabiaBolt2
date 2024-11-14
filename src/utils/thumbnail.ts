import { Shape } from '../types';

export const generateThumbnail = async (shapes: Shape[]): Promise<string> => {
  if (!shapes.length) return '';

  // Calculate bounding box of all shapes
  const bounds = shapes.reduce((acc, shape) => {
    const right = shape.position.x + (shape.width || 0);
    const bottom = shape.position.y + (shape.height || 0);
    return {
      minX: Math.min(acc.minX, shape.position.x),
      minY: Math.min(acc.minY, shape.position.y),
      maxX: Math.max(acc.maxX, right),
      maxY: Math.max(acc.maxY, bottom)
    };
  }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  // Create canvas with calculated dimensions
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Add padding
  const padding = 20;
  canvas.width = width + (padding * 2);
  canvas.height = height + (padding * 2);

  // Set white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Translate context to account for offset and padding
  ctx.translate(-bounds.minX + padding, -bounds.minY + padding);

  // Draw all shapes with their actual positions and dimensions
  for (const shape of shapes) {
    if (shape.type === 'image' && shape.imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = shape.imageUrl;
      });
      ctx.drawImage(img, shape.position.x, shape.position.y, shape.width, shape.height);
    }
    // Add other shape types here as needed
  }

  return canvas.toDataURL('image/jpeg', 0.8);
};
