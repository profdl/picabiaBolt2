import { useState, useEffect } from 'react';
import { Shape, DragStart } from '../../types';
import { useStore } from '../../store';

interface UseShapeDragProps {
  shape: Shape;
  isEditing: boolean;
  zoom: number;
}

export function useShapeDrag({ shape, isEditing, zoom }: UseShapeDragProps) {
  const [dragStart, setDragStart] = useState<DragStart | null>(null);
  const { updateShape, shapes } = useStore();
  const group_padding = 20;

  useEffect(() => {
    if (!dragStart || isEditing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const totalDx = (e.clientX - dragStart.x) / zoom;
      const totalDy = (e.clientY - dragStart.y) / zoom;

      // Get all shapes that should move together
      let shapesToMove = useStore.getState().selectedShapes;

      // If dragging a group, include all shapes in that group
      if (shape.type === "group") {
        const groupedShapeIds = shapes
          .filter((s) => s.groupId === shape.id)
          .map((s) => s.id);
        shapesToMove = [...new Set([...shapesToMove, ...groupedShapeIds])];
      }

      // Update positions of all affected shapes
      shapesToMove.forEach((id) => {
        const initialPos = dragStart.initialPositions.get(id);
        if (initialPos) {
          updateShape(id, {
            position: {
              x: initialPos.x + totalDx,
              y: initialPos.y + totalDy,
            },
          });
        }
      });
    };

    const handleMouseUp = () => {
      if (dragStart && shape.groupId) {
        const groupShape = shapes.find((s) => s.id === shape.groupId);
        if (groupShape) {
          const groupedShapes = shapes.filter((s) => s.groupId === shape.groupId);
          const minX = Math.min(...groupedShapes.map((s) => s.position.x));
          const minY = Math.min(...groupedShapes.map((s) => s.position.y));
          const maxX = Math.max(...groupedShapes.map((s) => s.position.x + s.width));
          const maxY = Math.max(...groupedShapes.map((s) => s.position.y + s.height));

          updateShape(shape.groupId, {
            position: {
              x: minX - group_padding,
              y: minY - group_padding,
            },
            width: maxX - minX + group_padding * 2,
            height: maxY - minY + group_padding * 2,
          });
        }
      }

      setDragStart(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragStart, shape.groupId, shape.id, shape.type, isEditing, zoom, shapes, updateShape]);

  const initDragStart = (e: React.MouseEvent) => {
    // Store initial positions of all shapes at drag start
    const initialPositions = new Map(
      shapes.map((s) => [s.id, { ...s.position }])
    );

    setDragStart({
      x: e.clientX,
      y: e.clientY,
      initialPositions,
    });
  };

  return {
    dragStart,
    initDragStart
  };
}