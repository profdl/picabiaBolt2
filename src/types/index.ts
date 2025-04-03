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

// Re-export specific types to ensure they are available
import { 
  Shape, 
  ImageShape, 
  StickyNoteShape, 
  GroupShape, 
  Position, 
  BaseShape 
} from './shapes';

export type { 
  Shape, 
  ImageShape, 
  StickyNoteShape, 
  GroupShape, 
  Position, 
  BaseShape 
}; 