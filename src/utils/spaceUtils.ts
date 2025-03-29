import { Position } from "../types";

interface Space {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const findOccupiedSpaces = (shapes: any[]): Space[] => {
  return shapes.map((shape) => ({
    x1: shape.position.x,
    y1: shape.position.y,
    x2: shape.position.x + shape.width,
    y2: shape.position.y + shape.height,
  }));
};

export const isPositionOverlapping = (
  x: number,
  y: number,
  width: number,
  height: number,
  occupiedSpaces: Space[],
  padding: number
): boolean => {
  const proposed = {
    x1: x - padding,
    y1: y - padding,
    x2: x + width + padding,
    y2: y + height + padding,
  };

  return occupiedSpaces.some(
    (space) =>
      proposed.x1 < space.x2 &&
      proposed.x2 > space.x1 &&
      proposed.y1 < space.y2 &&
      proposed.y2 > space.y1
  );
};

export const findOpenSpace = (
  shapes: any[],
  width: number,
  height: number,
  viewCenter: Position
): Position => {
  const PADDING = 5;
  const MAX_ATTEMPTS = 10;
  const occupiedSpaces = findOccupiedSpaces(shapes);

  // Start with trying to place directly to the right of viewport center
  let attemptX = viewCenter.x + PADDING;
  const attemptY = viewCenter.y - height / 2;

  // Try positions progressively further to the right
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (!isPositionOverlapping(
      attemptX,
      attemptY,
      width,
      height,
      occupiedSpaces,
      PADDING
    )) {
      return { x: attemptX, y: attemptY };
    }
    // Move further right for next attempt
    attemptX += (width + PADDING);
  }

  // If no space found, default to a position right of viewport center
  return {
    x: viewCenter.x + PADDING,
    y: viewCenter.y - height / 2,
  };
}; 