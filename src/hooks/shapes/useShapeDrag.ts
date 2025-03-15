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
  const control_padding = 40; // Extra padding for controls
  const sticky_control_padding = 100; // Extra padding for sticky note controls
  const group_control_padding = 60; // Increased padding for group controls

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
          const maxX = Math.max(
            ...groupedShapes.map((s) => {
              // Add extra width for controls that appear to the right
              const hasRightControls = s.type === "image" || s.type === "sketchpad";
              return s.position.x + s.width + (hasRightControls ? control_padding : 0);
            })
          );
          const maxY = Math.max(
            ...groupedShapes.map((s) => {
              // Add extra height for controls that appear below
              const hasBottomControls = 
                s.type === "image" || 
                s.type === "sketchpad" || 
                s.type === "depth" || 
                s.type === "edges" || 
                s.type === "pose" || 
                s.type === "diffusionSettings";
              const hasStickyControls = 
                s.type === "sticky" && (s.isTextPrompt || s.isNegativePrompt || s.showPrompt || s.showNegativePrompt);
              return s.position.y + s.height + (hasStickyControls ? sticky_control_padding : hasBottomControls ? control_padding : 0);
            })
          );

          updateShape(shape.groupId, {
            position: {
              x: minX - group_padding,
              y: minY - group_padding,
            },
            width: maxX - minX + group_padding * 2,
            height: maxY - minY + group_padding * 2 + group_control_padding,
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