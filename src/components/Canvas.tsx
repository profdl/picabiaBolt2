import React, { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { ShapeComponent } from "./Shape";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useCanvasMouseHandlers } from "../hooks/useCanvasMouseHandlers";
import { useCanvasDragAndDrop } from "../hooks/useCanvasDragAndDrop";

export function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [spacePressed] = useState(false);

  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    drawingShape,
    selectionBox,
    getCanvasPoint,
  } = useCanvasMouseHandlers();

  const {
    shapes,
    zoom,
    offset,
    isDragging,
    tool,
    gridEnabled,
    gridSize,
    setOffset,
    setZoom,
    selectedShapes,
    isEditingText,
  } = useStore();

  // Center the canvas when the component mounts
  useEffect(() => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setOffset({
        x: rect.width / 2,
        y: rect.height / 2,
      });
    }
  }, [setOffset]);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Render the grid
  const renderGrid = () => {
    if (!gridEnabled || !canvasRef.current || !shapes) return null;

    const rect = canvasRef.current.getBoundingClientRect();

    const visibleStartX = -offset.x / zoom;
    const visibleStartY = -offset.y / zoom;
    const visibleEndX = (rect.width - offset.x) / zoom;
    const visibleEndY = (rect.height - offset.y) / zoom;

    const startX = Math.floor(visibleStartX / gridSize - 1) * gridSize;
    const startY = Math.floor(visibleStartY / gridSize - 1) * gridSize;
    const endX = Math.ceil(visibleEndX / gridSize + 1) * gridSize;
    const endY = Math.ceil(visibleEndY / gridSize + 1) * gridSize;

    const verticalLines = [];
    const horizontalLines = [];

    for (let x = startX; x <= endX; x += gridSize) {
      const isMajorLine = Math.round(x / gridSize) % 5 === 0;
      verticalLines.push(
        <line
          key={`v-${x}`}
          x1={x * zoom + offset.x}
          y1={0}
          x2={x * zoom + offset.x}
          y2={rect.height}
          stroke={isMajorLine ? "#E2E8F0" : "#F1F5F9"}
          strokeWidth={isMajorLine ? 1 : 0.5}
        />
      );
    }

    for (let y = startY; y <= endY; y += gridSize) {
      const isMajorLine = Math.round(y / gridSize) % 5 === 0;
      horizontalLines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y * zoom + offset.y}
          x2={rect.width}
          y2={y * zoom + offset.y}
          stroke={isMajorLine ? "#E2E8F0" : "#F1F5F9"}
          strokeWidth={isMajorLine ? 1 : 0.5}
        />
      );
    }

    return (
      <svg
        className="absolute inset-0 pointer-events-none"
        width={rect.width}
        height={rect.height}
      >
        <g>
          {verticalLines}
          {horizontalLines}
        </g>
      </svg>
    );
  };

  // Block the browser's default zoom behavior
  useEffect(() => {
    const preventDefaultZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    window.addEventListener("wheel", preventDefaultZoom, { passive: false });
    return () => window.removeEventListener("wheel", preventDefaultZoom);
  }, []);

  // Handle zooming with the mouse wheel
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      const isEditingSticky = shapes.some(
        (shape) =>
          shape.type === "sticky" &&
          selectedShapes.includes(shape.id) &&
          isEditingText
      );
      if (isEditingSticky) return;

      // Existing diffusion settings check
      const isDiffusionSettings = (e.target as Element)?.closest(
        '[data-shape-type="diffusionSettings"]'
      );
      if (isDiffusionSettings) return;

      if (e.ctrlKey) {
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
      } else {
        setOffset({
          x: offset.x - e.deltaX,
          y: offset.y - e.deltaY,
        });
      }
    },
    [zoom, offset, setZoom, setOffset, shapes, selectedShapes, isEditingText]
  );

  // Add event listeners for zooming
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Handle drag and drop events for adding images to the canvas
  const { isDraggingFile, handleDrop, handleDragOver, handleDragLeave } =
    useCanvasDragAndDrop();

  return (
    <div
      ref={canvasRef}
      className={`w-full h-full overflow-hidden bg-white relative ${
        tool === "pan" || spacePressed
          ? "cursor-grab"
          : tool === "pen"
          ? "cursor-crosshair"
          : "cursor-default"
      } ${isDragging ? "!cursor-grabbing" : ""}`}
      onMouseDown={(e) => handleMouseDown(e, canvasRef, spacePressed)}
      onMouseMove={(e) => handleMouseMove(e, canvasRef)}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, canvasRef, getCanvasPoint)}
    >
      {isDraggingFile && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 border-dashed z-50 pointer-events-none flex items-center justify-center">
          <div className="bg-white px-4 py-2 rounded-lg shadow-lg">
            <p className="text-blue-600 font-medium">Drop images here</p>
          </div>
        </div>
      )}

      {renderGrid()}
      <div
        className="relative w-full h-full"
        style={{
          transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${
            offset.y / zoom
          }px)`,
          transformOrigin: "0 0",
        }}
      >
        {shapes?.map((shape) => (
          <ShapeComponent key={shape.id} shape={shape} />
        )) || null}
        {drawingShape && <ShapeComponent shape={drawingShape} />}
      </div>
      {selectionBox && (
        <div
          style={{
            position: "absolute",
            left:
              Math.min(
                selectionBox.startX,
                selectionBox.startX + selectionBox.width
              ) *
                zoom +
              offset.x,
            top:
              Math.min(
                selectionBox.startY,
                selectionBox.startY + selectionBox.height
              ) *
                zoom +
              offset.y,
            width: Math.abs(selectionBox.width) * zoom,
            height: Math.abs(selectionBox.height) * zoom,
            border: "1px dotted #2196f3",
            backgroundColor: "rgba(33, 150, 243, 0.1)",
            pointerEvents: "none",
            zIndex: 1000,
          }}
        />
      )}
    </div>
  );
}
