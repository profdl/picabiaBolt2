import { useCallback, useEffect, useState } from "react";
import { useStore } from "../store";

export function useCanvasZoom(canvasRef: React.RefObject<HTMLDivElement>) {
  const {
    zoom,
    offset,
    setZoom,
    setOffset,
    shapes,
    selectedShapes,
    isEditingText,
  } = useStore();
  const [isMiddleMouseDown, setIsMiddleMouseDown] = useState(false);

  // Block browser's default zoom behavior
  useEffect(() => {
    const preventDefaultZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    window.addEventListener("wheel", preventDefaultZoom, { passive: false });
    return () => window.removeEventListener("wheel", preventDefaultZoom);
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Middle mouse button (button 1)
    if (e.button === 1) {
      e.preventDefault();
      setIsMiddleMouseDown(true);
    }
  }, []);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (e.button === 1) {
      setIsMiddleMouseDown(false);
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isMiddleMouseDown) {
        setOffset({
          x: offset.x + e.movementX,
          y: offset.y + e.movementY,
        });
      }
    },
    [isMiddleMouseDown, offset.x, offset.y, setOffset]
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      const is3DShapeOrbiting = shapes.some(
        (shape) => shape.type === "3d" && shape.isOrbiting
      );
      const isEditingSticky = shapes.some(
        (shape) =>
          shape.type === "sticky" &&
          selectedShapes.includes(shape.id) &&
          isEditingText
      );
      if (isEditingSticky || is3DShapeOrbiting) return;

      const isDiffusionSettings = (e.target as Element)?.closest(
        '[data-shape-type="diffusionSettings"]'
      );
      if (isDiffusionSettings) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const mouseCanvasX = (mouseX - offset.x) / zoom;
      const mouseCanvasY = (mouseY - offset.y) / zoom;

      if (e.ctrlKey) {
        // Trackpad pinch zoom
        e.preventDefault();
        const delta = 1 - e.deltaY * 0.003;
        const newZoom = Math.min(Math.max(zoom * delta, 0.1), 5);
        
        setZoom(newZoom);
        setOffset({
          x: mouseX - mouseCanvasX * newZoom,
          y: mouseY - mouseCanvasY * newZoom,
        });
      } else if (!e.ctrlKey && e.deltaY) {
        if (e.deltaMode === 1) {
          // Mouse wheel zoom
          e.preventDefault();
          const delta = e.deltaY < 0 ? 1.1 : 0.9;
          const newZoom = Math.min(Math.max(zoom * delta, 0.1), 5);
          
          setZoom(newZoom);
          setOffset({
            x: mouseX - mouseCanvasX * newZoom,
            y: mouseY - mouseCanvasY * newZoom,
          });
        } else {
          // Trackpad two-finger pan
          setOffset({
            x: offset.x - e.deltaX,
            y: offset.y - e.deltaY,
          });
        }
      }
    },
    [
      shapes,
      canvasRef,
      offset.x,
      offset.y,
      zoom,
      setZoom,
      setOffset,
      selectedShapes,
      isEditingText,
    ]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseUp);

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseUp);
    };
  }, [handleWheel, handleMouseDown, handleMouseUp, handleMouseMove, canvasRef]);

  return { zoom, offset };
}