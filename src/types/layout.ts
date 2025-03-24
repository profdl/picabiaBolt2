import { Position } from './shapes';

export interface ShapeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportDimensions {
  width: number;
  height: number;
}

export interface OccupiedSpace {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ShapeAdditionOptions {
  position?: Position;
  width?: number;
  height?: number;
  aspectRatio?: number;
}

export interface ThreeJSShapeRef {
  exportToGLTF: () => void;
} 