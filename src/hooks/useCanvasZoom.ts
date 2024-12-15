import { useCallback, useEffect } from "react";
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
      if (isEditingSticky) return;
      if (is3DShapeOrbiting) return;

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

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(Math.max(zoom * delta, 0.1), 5);

      setZoom(newZoom);
      setOffset({
        x: mouseX - mouseCanvasX * newZoom,
        y: mouseY - mouseCanvasY * newZoom,
      });
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
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  return { zoom, offset };
}
