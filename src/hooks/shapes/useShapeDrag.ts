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
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [isAddedToGroup, setIsAddedToGroup] = useState(false);
  const [originalGroupBounds, setOriginalGroupBounds] = useState<{ [groupId: string]: { x: number; y: number; width: number; height: number } }>({});
  const { updateShape, shapes, addToGroup } = useStore();
  const group_padding = 16;
  const control_padding = 32;
  const sticky_control_padding = 80;
  const group_control_padding = 48;

  // Calculate if a point is inside a shape's bounds
  const isPointInShape = (point: { x: number; y: number }, shape: Shape) => {
    const shapeLeft = shape.position.x;
    const shapeRight = shape.position.x + shape.width;
    const shapeTop = shape.position.y;
    const shapeBottom = shape.position.y + shape.height;
    
    return (
      point.x >= shapeLeft &&
      point.x <= shapeRight &&
      point.y >= shapeTop &&
      point.y <= shapeBottom
    );
  };

  // Calculate group bounds including padding and controls
  const calculateGroupBounds = (groupShape: Shape, groupedShapes: Shape[]) => {
    const minX = Math.min(...groupedShapes.map((s) => s.position.x));
    const minY = Math.min(...groupedShapes.map((s) => s.position.y));
    const maxX = Math.max(
      ...groupedShapes.map((s) => {
        const hasRightControls = s.type === "image" || s.type === "sketchpad";
        return s.position.x + s.width + (hasRightControls ? control_padding : 0);
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
        const hasStickyControls = 
          s.type === "sticky" && (s.isTextPrompt || s.isNegativePrompt || s.showPrompt || s.showNegativePrompt);
        return s.position.y + s.height + (hasStickyControls ? sticky_control_padding : hasBottomControls ? control_padding : 0);
      })
    );

    return {
      x: minX - group_padding,
      y: minY - group_padding,
      width: maxX - minX + group_padding * 2,
      height: maxY - minY + group_padding * 2 + group_control_padding,
    };
  };

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

      // If dragging a group, update the group's position
      if (shape.type === "group") {
        const initialPos = dragStart.initialPositions.get(shape.id);
        if (initialPos) {
          updateShape(shape.id, {
            position: {
              x: initialPos.x + totalDx,
              y: initialPos.y + totalDy,
            },
          });
        }
      }

      // Check for hover over groups
      const draggedShape = shapes.find(s => s.id === shape.id);
      if (draggedShape && !draggedShape.groupId) {
        const groups = shapes.filter(s => s.type === "group");
        let foundHoveredGroup = null;

        // First, restore any groups that are no longer being hovered
        Object.entries(originalGroupBounds).forEach(([groupId, bounds]) => {
          const isStillHovered = groups.some(group => {
            const groupBounds = calculateGroupBounds(
              group,
              shapes.filter(s => s.groupId === group.id)
            );
            const shapeCenter = {
              x: draggedShape.position.x + draggedShape.width / 2,
              y: draggedShape.position.y + draggedShape.height / 2,
            };
            return isPointInShape(shapeCenter, {
              ...group,
              position: { x: groupBounds.x, y: groupBounds.y },
              width: groupBounds.width,
              height: groupBounds.height,
            });
          });

          if (!isStillHovered) {
            updateShape(groupId, {
              position: { x: bounds.x, y: bounds.y },
              width: bounds.width,
              height: bounds.height,
            });
            setOriginalGroupBounds(prev => {
              const newBounds = { ...prev };
              delete newBounds[groupId];
              return newBounds;
            });
          }
        });

        for (const group of groups) {
          const groupBounds = calculateGroupBounds(
            group,
            shapes.filter(s => s.groupId === group.id)
          );

          // Check if the dragged shape's center is over the group
          const shapeCenter = {
            x: draggedShape.position.x + draggedShape.width / 2,
            y: draggedShape.position.y + draggedShape.height / 2,
          };

          if (isPointInShape(shapeCenter, {
            ...group,
            position: { x: groupBounds.x, y: groupBounds.y },
            width: groupBounds.width,
            height: groupBounds.height,
          })) {
            foundHoveredGroup = group.id;
            
            // Store original bounds if not already stored
            if (!originalGroupBounds[group.id]) {
              setOriginalGroupBounds(prev => ({
                ...prev,
                [group.id]: { ...groupBounds }
              }));
            }
            
            // Calculate new bounds including the dragged shape
            const newBounds = calculateGroupBounds(
              group,
              [...shapes.filter(s => s.groupId === group.id), draggedShape]
            );
            
            // Update the group's size to accommodate the dragged shape
            updateShape(group.id, {
              position: { x: newBounds.x, y: newBounds.y },
              width: newBounds.width,
              height: newBounds.height,
            });
            break;
          }
        }

        setHoveredGroup(foundHoveredGroup);
      }
    };

    const handleMouseUp = () => {
      // Handle adding shape to group on drop
      if (hoveredGroup && shape.id && !shape.groupId) {
        addToGroup([shape.id], hoveredGroup);
        setIsAddedToGroup(true);
        // Reset the added state after animation
        setTimeout(() => setIsAddedToGroup(false), 500);
      }

      // Update group bounds if needed
      if (shape.groupId) {
        const groupShape = shapes.find((s) => s.id === shape.groupId);
        if (groupShape) {
          const groupedShapes = shapes.filter((s) => s.groupId === shape.groupId);
          const bounds = calculateGroupBounds(groupShape, groupedShapes);
          
          updateShape(shape.groupId, {
            position: { x: bounds.x, y: bounds.y },
            width: bounds.width,
            height: bounds.height,
          });
        }
      }

      setDragStart(null);
      setHoveredGroup(null);
      setOriginalGroupBounds({});
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragStart, shape.groupId, shape.id, shape.type, isEditing, zoom, shapes, updateShape, addToGroup, originalGroupBounds]);

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
    initDragStart,
    hoveredGroup,
    isAddedToGroup,
  };
}