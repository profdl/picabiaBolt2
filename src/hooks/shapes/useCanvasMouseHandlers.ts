import { useCallback } from 'react';
import { Shape } from '../../types/shapes';

interface UseCanvasMouseHandlersProps {
  isDragging: boolean;
  isResizing: boolean;
  isRotating: boolean;
  isEditing: boolean;
  selectedShapes: string[];
  shapes: Shape[];
  updateShape: (id: string, updates: Partial<Shape>) => void;
  setSelectedShapes: (shapes: string[]) => void;
}

export const useCanvasMouseHandlers = ({
  isDragging,
  isResizing,
  isRotating,
  isEditing,
  selectedShapes,
  shapes,
  updateShape,
  setSelectedShapes
}: UseCanvasMouseHandlersProps) => {
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (isDragging || isResizing || isRotating || isEditing) return;
    
    // Check if clicking on a shape
    const target = e.target as HTMLElement;
    const shapeElement = target.closest('[data-shape-id]');
    
    if (!shapeElement) {
      // Clicking on canvas - deselect all shapes
      if (selectedShapes.length > 0) {
        // Preserve filter values for all selected image shapes before deselecting
        selectedShapes.forEach((shapeId: string) => {
          const shape = shapes.find((s: Shape) => s.id === shapeId);
          if (shape?.type === 'image') {
            const filterValues = {
              contrast: shape.contrast ?? 1.0,
              saturation: shape.saturation ?? 1.0,
              brightness: shape.brightness ?? 1.0
            };
            updateShape(shapeId, filterValues);
          }
        });
        setSelectedShapes([]);
      }
    }
  }, [isDragging, isResizing, isRotating, isEditing, selectedShapes, shapes, updateShape, setSelectedShapes]);

  return {
    handleCanvasClick
  };
}; 