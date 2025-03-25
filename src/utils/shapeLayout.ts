import { Shape, Position } from '../types';
import { ShapeBounds, ViewportDimensions, OccupiedSpace } from '../types/layout';

// Constants
export const LAYOUT_CONSTANTS = {
  PADDING: {
    SHAPE: 20,
    GROUP: 16,
    CONTROL: 32,
    STICKY_CONTROL: 80,
    GROUP_CONTROL: 48,
    MIN: 5,
  },
  DEFAULT: {
    WIDTH: 200,
    HEIGHT: 200,
    ASPECT_RATIO: 9/16,
  },
  VIEWPORT: {
    DEFAULT_WIDTH_RATIO: 0.4,
  }
} as const;

export const shapeLayout = {
  // Viewport utilities
  getViewportDimensions: (): ViewportDimensions => ({
    width: window.innerWidth,
    height: window.innerHeight
  }),

  getViewportCenter: (zoom: number, offset: Position): Position => {
    const rect = document.querySelector("#root")?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    return {
      x: (rect.width / 2 - offset.x) / zoom,
      y: (rect.height / 2 - offset.y) / zoom,
    };
  },

  // Shape bounds calculation
  getShapeBounds: (shape: Shape): ShapeBounds => ({
    x: shape.position.x,
    y: shape.position.y,
    width: shape.width,
    height: shape.height
  }),

  // Space management
  findOccupiedSpaces: (shapes: Shape[]): OccupiedSpace[] => {
    return shapes.map((shape) => ({
      x1: shape.position.x,
      y1: shape.position.y,
      x2: shape.position.x + shape.width,
      y2: shape.position.y + shape.height,
    }));
  },

  isSpaceOverlapping: (
    proposed: OccupiedSpace,
    occupiedSpaces: OccupiedSpace[],
    padding: number = LAYOUT_CONSTANTS.PADDING.MIN
  ): boolean => {
    const paddedProposed = {
      x1: proposed.x1 - padding,
      y1: proposed.y1 - padding,
      x2: proposed.x2 + padding,
      y2: proposed.y2 + padding,
    };

    return occupiedSpaces.some(
      (space) =>
        paddedProposed.x1 < space.x2 &&
        paddedProposed.x2 > space.x1 &&
        paddedProposed.y1 < space.y2 &&
        paddedProposed.y2 > space.y1
    );
  },

  // Position calculation
  findOpenSpace: (
    shapes: Shape[],
    width: number,
    height: number,
    viewCenter: Position,
    maxAttempts: number = 10
  ): Position => {
    const occupiedSpaces = shapeLayout.findOccupiedSpaces(shapes);
    let attemptX = viewCenter.x + LAYOUT_CONSTANTS.PADDING.MIN;
    const attemptY = viewCenter.y - height / 2;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const proposedSpace = {
        x1: attemptX,
        y1: attemptY,
        x2: attemptX + width,
        y2: attemptY + height,
      };

      if (!shapeLayout.isSpaceOverlapping(proposedSpace, occupiedSpaces)) {
        return { x: attemptX, y: attemptY };
      }

      attemptX += (width + LAYOUT_CONSTANTS.PADDING.MIN);
    }

    // Default position if no space found
    return {
      x: viewCenter.x + LAYOUT_CONSTANTS.PADDING.MIN,
      y: viewCenter.y - height / 2,
    };
  },

  // Size calculation
  calculateDefaultSize: (viewportDimensions: ViewportDimensions, aspectRatio?: number) => {
    const defaultWidth = viewportDimensions.width * LAYOUT_CONSTANTS.VIEWPORT.DEFAULT_WIDTH_RATIO;
    
    if (aspectRatio) {
      return {
        width: defaultWidth,
        height: defaultWidth / aspectRatio
      };
    }

    return {
      width: defaultWidth,
      height: defaultWidth * LAYOUT_CONSTANTS.DEFAULT.ASPECT_RATIO
    };
  },

  // Centering calculation
  calculateCenteringOffset: (shape: Shape, zoom: number): Position => {
    const viewportDimensions = shapeLayout.getViewportDimensions();
    
    return {
      x: -(shape.position.x + shape.width / 2) * zoom + viewportDimensions.width / 2,
      y: -(shape.position.y + shape.height / 2) * zoom + viewportDimensions.height / 2
    };
  },

  // Group calculations
  calculateGroupBounds: (groupedShapes: Shape[]): ShapeBounds => {
    const minX = Math.min(...groupedShapes.map((s) => s.position.x));
    const minY = Math.min(...groupedShapes.map((s) => s.position.y));
    const maxX = Math.max(
      ...groupedShapes.map((s) => {
        const hasRightControls = s.type === "image" || s.type === "sketchpad";
        return s.position.x + s.width + (hasRightControls ? LAYOUT_CONSTANTS.PADDING.CONTROL : 0);
      })
    );
    const maxY = Math.max(
      ...groupedShapes.map((s) => {
        const hasBottomControls = 
          s.type === "image" || 
          s.type === "sketchpad" || 
          s.type === "depth" || 
          s.type === "edges" || 
          s.type === "pose" || 
          s.type === "diffusionSettings";
        const hasStickyControls = s.type === "sticky";
        return s.position.y + s.height + 
          (hasStickyControls ? LAYOUT_CONSTANTS.PADDING.STICKY_CONTROL : 
           hasBottomControls ? LAYOUT_CONSTANTS.PADDING.CONTROL : 0);
      })
    );

    return {
      x: minX - LAYOUT_CONSTANTS.PADDING.GROUP,
      y: minY - LAYOUT_CONSTANTS.PADDING.GROUP,
      width: maxX - minX + LAYOUT_CONSTANTS.PADDING.GROUP * 2,
      height: maxY - minY + LAYOUT_CONSTANTS.PADDING.GROUP * 2 + LAYOUT_CONSTANTS.PADDING.GROUP_CONTROL,
    };
  }
}; 