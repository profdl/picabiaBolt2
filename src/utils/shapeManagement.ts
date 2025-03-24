import { Shape, Position } from '../types';
import { shapeLayout } from './shapeLayout';
import { ShapeAdditionOptions } from '../types/layout';

export const shapeManagement = {
  getViewportDimensions: shapeLayout.getViewportDimensions,

  calculateDefaultSize: shapeLayout.calculateDefaultSize,

  findRightmostBoundary: (shapes: Shape[]): number => {
    if (shapes.length === 0) return 0;
    return Math.max(...shapes.map(shape => shape.position.x + shape.width));
  },

  calculateNewPosition: (shapes: Shape[], shapeSize: { width: number; height: number }): Position => {
    const viewportDimensions = shapeLayout.getViewportDimensions();
    const viewCenter = {
      x: viewportDimensions.width / 2,
      y: viewportDimensions.height / 2
    };
    
    return shapeLayout.findOpenSpace(
      shapes,
      shapeSize.width,
      shapeSize.height,
      viewCenter
    );
  },

  prepareShapeAddition: (
    shapes: Shape[],
    options: ShapeAdditionOptions = {}
  ): { position: Position; width: number; height: number } => {
    const viewportDimensions = shapeLayout.getViewportDimensions();
    const { width, height } = shapeLayout.calculateDefaultSize(
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

  calculateCenteringOffset: shapeLayout.calculateCenteringOffset,

  calculateGroupBounds: shapeLayout.calculateGroupBounds
};