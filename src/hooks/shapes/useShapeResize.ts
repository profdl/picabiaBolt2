import { useState, useEffect } from "react";
import { Shape } from "../../types";
import { useStore } from "../../store";
import { shapeLayout, LAYOUT_CONSTANTS } from "../../utils/shapeLayout";

interface ResizeStart {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: number;
}

export const useShapeResize = (
  shape: Shape,
  zoom: number,
  updateShape: (id: string, updates: Partial<Shape>) => void,
  updateShapes: (updates: { id: string; shape: Partial<Shape> }[]) => void
) => {
  const [resizeStart, setResizeStart] = useState<ResizeStart | null>(null);
  const { shapes } = useStore();

  useEffect(() => {
    if (!resizeStart) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeStart.x) / zoom;
      const dy = (e.clientY - resizeStart.y) / zoom;

      // For image shapes, always maintain aspect ratio
      if (shape.type === "image") {
        const aspectRatio = resizeStart.aspectRatio;
        if (Math.abs(dx) > Math.abs(dy)) {
          const newWidth = Math.max(LAYOUT_CONSTANTS.DEFAULT.WIDTH, resizeStart.width + dx);
          const newHeight = newWidth / aspectRatio;
          updateShape(shape.id, {
            width: newWidth,
            height: newHeight,
          });
        } else {
          const newHeight = Math.max(LAYOUT_CONSTANTS.DEFAULT.HEIGHT, resizeStart.height + dy);
          const newWidth = newHeight * aspectRatio;
          updateShape(shape.id, {
            width: newWidth,
            height: newHeight,
          });
        }
        return;
      }

      // Get minimum dimensions based on shape type
      const minDimensions = shape.type === "sticky" 
        ? shapeLayout.calculateTextContentSize(shape.content || '', shape.fontSize || 16)
        : LAYOUT_CONSTANTS.MINIMUM.DEFAULT;

      let newWidth = Math.max(minDimensions.width, resizeStart.width + dx);
      let newHeight = Math.max(minDimensions.height, resizeStart.height + dy);

      if (e.shiftKey && resizeStart.aspectRatio) {
        if (Math.abs(dx) > Math.abs(dy)) {
          newHeight = newWidth / resizeStart.aspectRatio;
        } else {
          newWidth = newHeight * resizeStart.aspectRatio;
        }
      }

      if (shape.type === "group") {
        // For groups, we just want to resize the container
        // No need to scale or reposition child shapes
        
        // Calculate the minimum size needed to contain all shapes in the group
        const groupedShapes = shapes.filter(s => s.groupId === shape.id);
        
        // If there are shapes in the group, calculate their bounding box
        if (groupedShapes.length > 0) {
          // Find the rightmost and bottommost points of any shape in the group
          // (relative to the group's top-left corner)
          const rightEdge = Math.max(...groupedShapes.map(s => 
            (s.position.x + s.width) - shape.position.x
          ));
          
          const bottomEdge = Math.max(...groupedShapes.map(s => 
            (s.position.y + s.height) - shape.position.y
          ));
          
          // Ensure the new size is not smaller than what's needed to contain all shapes
          newWidth = Math.max(newWidth, rightEdge);
          newHeight = Math.max(newHeight, bottomEdge);
        } else {
          // If there are no shapes in the group, use default minimum size
          newWidth = Math.max(newWidth, LAYOUT_CONSTANTS.DEFAULT.WIDTH);
          newHeight = Math.max(newHeight, LAYOUT_CONSTANTS.DEFAULT.HEIGHT);
        }
        
        // Only update the width and height of the group
        updateShape(shape.id, {
          width: newWidth,
          height: newHeight,
        });
        
        // Don't update child shape positions at all - they should stay where they are
      } else {
        updateShape(shape.id, {
          width: newWidth,
          height: newHeight,
        });
      }
    };

    const handleMouseUp = () => {
      // Dispatch a custom event to notify that scaling has ended
      window.dispatchEvent(new CustomEvent('shapeScalingEnd'));
      setResizeStart(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizeStart, shape, updateShape, updateShapes, zoom, shapes]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Dispatch a custom event to notify that scaling has started
    window.dispatchEvent(new CustomEvent('shapeScalingStart'));
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: shape.width,
      height: shape.height,
      aspectRatio: shape.width / shape.height,
    });
  };

  return {
    handleResizeStart,
    setResizeStart,
  };
};
