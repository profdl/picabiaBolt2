import { Shape, Position } from '../types';

interface ViewportDimensions {
  width: number;
  height: number;
}

interface ShapeAdditionOptions {
  position?: Position;
  width?: number;
  height?: number;
  aspectRatio?: number;
}

export interface ShapeWithDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const shapeManagement = {
  getViewportDimensions: (): ViewportDimensions => ({
    width: window.innerWidth,
    height: window.innerHeight
  }),

  calculateDefaultSize: (viewportDimensions: ViewportDimensions, aspectRatio?: number) => {
    const defaultWidth = viewportDimensions.width * 0.4;
    
    if (aspectRatio) {
      return {
        width: defaultWidth,
        height: defaultWidth / aspectRatio
      };
    }

    return {
      width: defaultWidth,
      height: defaultWidth * (9/16) // Default aspect ratio if none provided
    };
  },

  findRightmostBoundary: (shapes: Shape[]): number => {
    if (shapes.length === 0) return 0;
    return Math.max(...shapes.map(shape => shape.position.x + shape.width));
  },

  calculateNewPosition: (shapes: Shape[], shapeSize: { width: number; height: number }): Position => {
    const PADDING = 20;
    const rightmostX = shapeManagement.findRightmostBoundary(shapes);
    const viewportDimensions = shapeManagement.getViewportDimensions();
    
    return {
      x: rightmostX + PADDING,
      y: (viewportDimensions.height / 2) - (shapeSize.height / 2)
    };
  },

  prepareShapeAddition: (
    shapes: Shape[],
    options: ShapeAdditionOptions = {}
  ): { position: Position; width: number; height: number } => {
    const viewportDimensions = shapeManagement.getViewportDimensions();
    const { width, height } = shapeManagement.calculateDefaultSize(
      viewportDimensions,
      options.aspectRatio
    );

    const finalDimensions = {
      width: options.width || width,
      height: options.height || height
    };

    const position = options.position || 
      shapeManagement.calculateNewPosition(shapes, finalDimensions);

    return {
      position,
      width: finalDimensions.width,
      height: finalDimensions.height
    };
  },

  calculateCenteringOffset: (
    shape: Shape,
    zoom: number
  ): Position => {
    const viewportDimensions = shapeManagement.getViewportDimensions();
    
    return {
      x: -(shape.position.x + shape.width / 2) * zoom + viewportDimensions.width / 2,
      y: -(shape.position.y + shape.height / 2) * zoom + viewportDimensions.height / 2
    };
  }
};