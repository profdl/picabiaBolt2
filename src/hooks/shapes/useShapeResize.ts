import { useState, useEffect } from "react";
import { Shape } from "../../types";
import { useStore } from "../../store";

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

  // Calculate minimum size for a group based on its contents
  const calculateGroupMinSize = (groupShape: Shape) => {
    const groupedShapes = shapes.filter(s => s.groupId === groupShape.id);
    if (groupedShapes.length === 0) return { width: 50, height: 50 };

    const group_padding = 16;
    const control_padding = 32;
    const sticky_control_padding = 80;
    const group_control_padding = 48;

    const minX = Math.min(...groupedShapes.map(s => s.position.x));
    const minY = Math.min(...groupedShapes.map(s => s.position.y));
    const maxX = Math.max(
      ...groupedShapes.map(s => {
        const hasRightControls = s.type === "image" || s.type === "sketchpad";
        return s.position.x + s.width + (hasRightControls ? control_padding : 0);
      })
    );
    const maxY = Math.max(
      ...groupedShapes.map(s => {
        const hasBottomControls = 
          s.type === "image" || 
          s.type === "sketchpad" || 
          s.type === "depth" || 
          s.type === "edges" || 
          s.type === "pose" || 
          s.type === "diffusionSettings";
        const hasStickyControls = s.type === "sticky";
        return s.position.y + s.height + (hasStickyControls ? sticky_control_padding : hasBottomControls ? control_padding : 0);
      })
    );

    return {
      width: maxX - minX + group_padding * 2,
      height: maxY - minY + group_padding * 2 + group_control_padding,
    };
  };

  useEffect(() => {
    if (!resizeStart) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeStart.x) / zoom;
      const dy = (e.clientY - resizeStart.y) / zoom;

      // For image shapes, always maintain aspect ratio
      if (shape.type === "image") {
        const aspectRatio = resizeStart.aspectRatio;
        if (Math.abs(dx) > Math.abs(dy)) {
          const newWidth = Math.max(50, resizeStart.width + dx);
          const newHeight = newWidth / aspectRatio;
          updateShape(shape.id, {
            width: newWidth,
            height: newHeight,
          });
        } else {
          const newHeight = Math.max(50, resizeStart.height + dy);
          const newWidth = newHeight * aspectRatio;
          updateShape(shape.id, {
            width: newWidth,
            height: newHeight,
          });
        }
        return;
      }

      let newWidth = Math.max(50, resizeStart.width + dx);
      let newHeight = Math.max(50, resizeStart.height + dy);

      if (e.shiftKey && resizeStart.aspectRatio) {
        if (Math.abs(dx) > Math.abs(dy)) {
          newHeight = newWidth / resizeStart.aspectRatio;
        } else {
          newWidth = newHeight * resizeStart.aspectRatio;
        }
      }

      if (shape.type === "group") {
        // Calculate minimum size for the group
        const minSize = calculateGroupMinSize(shape);
        
        // Ensure the new size is not smaller than the minimum
        newWidth = Math.max(newWidth, minSize.width);
        newHeight = Math.max(newHeight, minSize.height);

        updateShapes([
          {
            id: shape.id,
            shape: {
              width: newWidth,
              height: newHeight,
            },
          },
        ]);
      } else {
        updateShape(shape.id, {
          width: newWidth,
          height: newHeight,
        });
      }
    };

    const handleMouseUp = () => {
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
