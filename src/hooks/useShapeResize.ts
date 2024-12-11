import { useState, useEffect } from "react";
import { Shape } from "../types";

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
  }, [resizeStart, shape, updateShape, updateShapes, zoom]);

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
