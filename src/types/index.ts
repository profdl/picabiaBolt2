export * from './shapes';
export * from './canvas';
export * from './images';
export * from './workflow';
export * from './ui';
export * from './auth';
export * from './api';
export * from './storage';
export * from './events';
export * from './validation';

export interface Shape {
  id: string;
  type: string;
  width: number;
  height: number;
  x: number;
  y: number;
  sourceImageId: string;
  isUploading?: boolean;
  depthUrl?: string;
  edgeUrl?: string;
  poseUrl?: string;
  depthStrength?: number;
  edgesStrength?: number;
  poseStrength?: number;
} 