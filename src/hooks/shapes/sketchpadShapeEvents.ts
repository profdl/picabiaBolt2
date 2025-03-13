import { RefObject, useCallback } from "react";
import { Shape } from "../../types";
import { useStore } from "../../store";

interface UseSketchpadShapeEventsProps {
  shape: Shape;
  sketchPadRef: RefObject<HTMLCanvasElement>;
}

export function useSketchpadShapeEvents({ shape, sketchPadRef }: UseSketchpadShapeEventsProps) {
  const { updateShape } = useStore();

  const handleClear = useCallback(() => {
    if (sketchPadRef.current) {
      const ctx = sketchPadRef.current.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, 512, 512);

        const overlayCanvas = document.querySelector(
          `canvas[data-overlay="${shape.id}"]`
        ) as HTMLCanvasElement | null;
        if (overlayCanvas) {
          const overlayCtx = overlayCanvas.getContext("2d");
          if (overlayCtx) {
            overlayCtx.clearRect(0, 0, 512, 512);
          }
        }

        const canvasData = sketchPadRef.current.toDataURL("image/png");
        updateShape(shape.id, { canvasData });
      }
    }
  }, [shape.id, updateShape, sketchPadRef]);

  const initializeCanvas = useCallback(() => {
    if (sketchPadRef.current && shape.canvasData) {
      const canvas = sketchPadRef.current;
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        ctx?.drawImage(img, 0, 0);
      };
      img.src = shape.canvasData;
    }
  }, [shape.canvasData, sketchPadRef]);

  const updateCanvasImage = useCallback(() => {
    const canvas = sketchPadRef.current;
    if (!canvas) return undefined;
    return canvas.toDataURL("image/png");
  }, [sketchPadRef]);

  return {
    handleClear,
    initializeCanvas,
    updateCanvasImage
  };
}