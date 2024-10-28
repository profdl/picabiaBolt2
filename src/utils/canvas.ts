import { Position, Shape } from '../types';

interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function getShapesBounds(shapes: Shape[]): ViewportBounds | null {
  if (shapes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  shapes.forEach(shape => {
    const left = shape.position.x;
    const top = shape.position.y;
    const right = left + shape.width;
    const bottom = top + shape.height;

    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

export function calculateViewportFit(
  shapes: Shape[],
  viewportWidth: number,
  viewportHeight: number,
  padding: number = 50
): { zoom: number; offset: Position } {
  const bounds = getShapesBounds(shapes);
  
  if (!bounds) {
    return {
      zoom: 1,
      offset: { x: viewportWidth / 2, y: viewportHeight / 2 }
    };
  }

  const contentWidth = bounds.width + padding * 2;
  const contentHeight = bounds.height + padding * 2;

  const zoom = Math.min(
    viewportWidth / contentWidth,
    viewportHeight / contentHeight,
    1
  );

  const centerX = bounds.minX + bounds.width / 2;
  const centerY = bounds.minY + bounds.height / 2;

  return {
    zoom,
    offset: {
      x: viewportWidth / 2 - centerX * zoom,
      y: viewportHeight / 2 - centerY * zoom
    }
  };
}