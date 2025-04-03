import { useCallback, useEffect, useState } from "react";
import { useStore } from "../../store";

interface GestureEvent extends Event {
  scale: number;
  rotation: number;
  clientX: number;
  clientY: number;
}

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
  const [initialScale, setInitialScale] = useState(1);

  // Block browser's default zoom behavior
  useEffect(() => {
    const preventDefaultZoom = (e: WheelEvent) => {
      // Only prevent if the event target is within the canvas
      const isCanvas = (e.target as Element)?.closest('#canvas-container');
      if (!isCanvas) return;
  
      if (e.ctrlKey || Math.abs(e.deltaY) !== 0) {
        e.preventDefault();
      }
    };
  
    // Add touchmove handler to prevent unwanted gestures
    const preventDefaultGestures = (e: TouchEvent) => {
      // Only prevent if the event target is within the canvas
      const isCanvas = (e.target as Element)?.closest('#canvas-container');
      if (!isCanvas) return;
  
      if (e.touches.length === 2) {
        e.preventDefault();
      }
    };

    const handleGestureStart = (e: Event) => {
      const isCanvas = (e.target as Element)?.closest('#canvas-container');
      if (!isCanvas) return;
      
      e.preventDefault();
      setInitialScale(zoom);
    };

    const handleGestureChange = (e: Event) => {
      const isCanvas = (e.target as Element)?.closest('#canvas-container');
      if (!isCanvas) return;
      
      e.preventDefault();
      const gestureEvent = e as GestureEvent;
      const newScale = initialScale * gestureEvent.scale;
      
      // Limit zoom range
      const clampedScale = Math.min(Math.max(newScale, 0.1), 5);
      
      // Calculate center point for zoom
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      setZoom(clampedScale);
      setOffset({
        x: centerX - (centerX - offset.x) * (clampedScale / zoom),
        y: centerY - (centerY - offset.y) * (clampedScale / zoom)
      });
    };
  
    window.addEventListener("wheel", preventDefaultZoom, { passive: false });
    window.addEventListener("touchmove", preventDefaultGestures, { passive: false });
    window.addEventListener("gesturestart", handleGestureStart, { passive: false });
    window.addEventListener("gesturechange", handleGestureChange, { passive: false });
  
    return () => {
      window.removeEventListener("wheel", preventDefaultZoom);
      window.removeEventListener("touchmove", preventDefaultGestures);
      window.removeEventListener("gesturestart", handleGestureStart);
      window.removeEventListener("gesturechange", handleGestureChange);
    };
  }, [zoom, offset, setZoom, setOffset, initialScale]);

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