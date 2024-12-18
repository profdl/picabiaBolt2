import { useState } from "react";
import { useStore } from "../store";
import { Position, Shape } from "../types";

export function useCanvasMouseHandlers() {
  const [startPan, setStartPan] = useState<Position | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Position[]>([]);
  const [drawingShape, setDrawingShape] = useState<Shape | null>(null);
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    width: number;
    height: number;
  } | null>(null);

  // Get your store values and functions
  const {
    shapes,
    offset,
    zoom,
    tool,
    currentColor,
    strokeWidth,
    setOffset,
    setIsDragging,
    addShape,
    setSelectedShapes,
    selectedShapes,
    setTool,
  } = useStore();

  function getCanvasPoint(
    e: React.MouseEvent | React.DragEvent,
    canvasRef: React.RefObject<HTMLDivElement>
  ): Position {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    return {
      x: (mouseX - offset.x) / zoom,
      y: (mouseY - offset.y) / zoom,
    };
  }

  const handleMouseDown = (
    e: React.MouseEvent,
    canvasRef: React.RefObject<HTMLDivElement>,
    spacePressed: boolean
  ) => {
    if (tool === "brush" || tool === "eraser") {
      const clickedElement = e.target as HTMLElement;
      const isSketchpad = clickedElement.closest("canvas");
      if (!isSketchpad) {
        setTool("select");
        return;
      }
    }
    const isOrbiting = shapes.some(
      (shape) =>
        shape.type === "3d" &&
        selectedShapes.includes(shape.id) &&
        shape.isOrbiting
    );
    if (isOrbiting) return;
    // Check if clicking on shape controls
    const controlsPanel = (e.target as Element)?.closest(
      "[data-controls-panel]"
    );
    if (controlsPanel) {
      return;
    }

    const isEditingSticky = shapes.some(
      (shape) =>
        shape.type === "sticky" &&
        selectedShapes.includes(shape.id) &&
        shape.isEditing
    );

    if (e.button === 1 || tool === "pan" || spacePressed) {
      e.preventDefault();
      setStartPan({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      setIsDragging(true);
    } else if (tool === "pen") {
      const point = getCanvasPoint(e, canvasRef);
      setCurrentPath([point]);
      setIsDrawing(true);

      const newShape: Shape = {
        id: Math.random().toString(36).substr(2, 9),
        type: "drawing",
        position: { x: point.x, y: point.y },
        width: 0,
        height: 0,
        color: currentColor,
        points: [{ x: 0, y: 0 }],
        strokeWidth,
        rotation: 0,
        isUploading: false,
        model: "",
        useSettings: false,
        depthStrength: 0.25,
        edgesStrength: 0.25,
        contentStrength: 0.25,
        poseStrength: 0.25,
        sketchStrength: 0.25,
        remixStrength: 0.25,
        isEditing: false,
      };
      setDrawingShape(newShape);
    } else if (!e.shiftKey && !isEditingSticky) {
      setSelectedShapes([]);
    }

    if (tool !== "select" || isEditingSticky) return;

    const point = getCanvasPoint(e, canvasRef);
    setSelectionBox({
      startX: point.x,
      startY: point.y,
      width: 0,
      height: 0,
    });
  };
  const handleMouseMove = (
    e: React.MouseEvent,
    canvasRef: React.RefObject<HTMLDivElement>
  ) => {
    // Don't handle mouse move if we're over controls
    const controlsPanel = (e.target as Element)?.closest(
      "[data-controls-panel]"
    );
    if (controlsPanel) {
      return;
    }
    const isEditingSticky = shapes.some(
      (shape) =>
        shape.type === "sticky" &&
        selectedShapes.includes(shape.id) &&
        shape.isEditing
    );

    if (startPan) {
      setOffset({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    } else if (isDrawing && tool === "pen") {
      const point = getCanvasPoint(e, canvasRef);
      const newPath = [...currentPath, point];
      setCurrentPath(newPath);

      const padding = strokeWidth / 2;
      const xs = newPath.map((p) => p.x);
      const ys = newPath.map((p) => p.y);
      const minX = Math.min(...xs) - padding;
      const maxX = Math.max(...xs) + padding;
      const minY = Math.min(...ys) - padding;
      const maxY = Math.max(...ys) + padding;
      const width = Math.max(maxX - minX, 1);
      const height = Math.max(maxY - minY, 1);

      const normalizedPoints = newPath.map((p) => ({
        x: p.x - minX,
        y: p.y - minY,
      }));

      setDrawingShape((prev) =>
        prev
          ? {
              ...prev,
              position: { x: minX, y: minY },
              width,
              height,
              points: normalizedPoints,
            }
          : null
      );
    }
    if (!selectionBox || isEditingSticky) return;

    const currentPoint = getCanvasPoint(e, canvasRef);
    const width = currentPoint.x - selectionBox.startX;
    const height = currentPoint.y - selectionBox.startY;

    setSelectionBox((prev) => ({
      ...prev!,
      width,
      height,
    }));
  };

  const handleMouseUp = () => {
    // Clean up all drag states unconditionally
    setStartPan(null);
    setIsDragging(false);

    // Only handle shape-related operations if not on controls
    const activeElement = document.activeElement;
    const controlsPanel = activeElement?.closest("[data-controls-panel]");
    if (controlsPanel) {
      return;
    }

    if (isDrawing && drawingShape && currentPath.length > 1) {
      addShape(drawingShape);
    }

    setIsDrawing(false);
    setCurrentPath([]);
    setDrawingShape(null);

    if (!selectionBox) return;

    const selectedShapeIds = shapes
      .filter((shape) => {
        const shapeRight = shape.position.x + shape.width;
        const shapeBottom = shape.position.y + shape.height;

        const boxLeft = Math.min(
          selectionBox.startX,
          selectionBox.startX + selectionBox.width
        );
        const boxRight = Math.max(
          selectionBox.startX,
          selectionBox.startX + selectionBox.width
        );
        const boxTop = Math.min(
          selectionBox.startY,
          selectionBox.startY + selectionBox.height
        );
        const boxBottom = Math.max(
          selectionBox.startY,
          selectionBox.startY + selectionBox.height
        );

        return (
          shape.position.x < boxRight &&
          shapeRight > boxLeft &&
          shape.position.y < boxBottom &&
          shapeBottom > boxTop
        );
      })
      .map((shape) => shape.id);

    setSelectedShapes(selectedShapeIds);
    setSelectionBox(null);
  };

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    startPan,
    isDrawing,
    currentPath,
    drawingShape,
    selectionBox,
    getCanvasPoint,
  };
}
