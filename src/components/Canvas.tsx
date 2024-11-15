import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Position, Shape } from '../types';
import { ShapeComponent } from './Shape';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useImageUpload } from '../hooks/useImageUpload';

export function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [startPan, setStartPan] = useState<Position | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [spacePressed] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Position[]>([]);
  const [drawingShape, setDrawingShape] = useState<Shape | null>(null);
  const { handleImageUpload } = useImageUpload();
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    width: number;
    height: number;
  } | null>(null);
  
  const {
    shapes,
    zoom,
    offset,
    isDragging,
    tool,
    currentColor,
    strokeWidth,
    gridEnabled,
    gridSize,
    setOffset,
    setIsDragging,
    setZoom,
    addShape,
    setSelectedShapes,
  } = useStore();
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const point = getCanvasPoint(e);

    for (const file of imageFiles) {
      await handleImageUpload(file, point);
    }
  };

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  useEffect(() => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setOffset({
        x: rect.width / 2,
        y: rect.height / 2,
      });
    }
  }, [setOffset]);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
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
    [zoom, offset, setZoom, setOffset]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const getCanvasPoint = (e: React.MouseEvent | React.DragEvent): Position => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    // Get the mouse position relative to the canvas
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert to canvas coordinates considering zoom and offset
    return {
      x: (mouseX - offset.x) / zoom,
      y: (mouseY - offset.y) / zoom
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || tool === 'pan' || spacePressed) {
      e.preventDefault();
      setStartPan({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      setIsDragging(true);
    } else if (tool === 'pen') {
      const point = getCanvasPoint(e);
      setCurrentPath([point]);
      setIsDrawing(true);

      const newShape: Shape = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'drawing',
        position: { x: point.x, y: point.y },
        width: 0,
        height: 0,
        color: currentColor,
        points: [{ x: 0, y: 0 }],
        strokeWidth,
        rotation: 0,
        isUploading: false
      };
      setDrawingShape(newShape);
    } else if (!e.shiftKey) {
      setSelectedShapes([]);
    }
    if (tool !== 'select') return;
  
    const point = getCanvasPoint(e);
    setSelectionBox({
      startX: point.x,
      startY: point.y,
      width: 0,
      height: 0
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (startPan) {
      setOffset({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    } else if (isDrawing && tool === 'pen') {
      const point = getCanvasPoint(e);
      const newPath = [...currentPath, point];
      setCurrentPath(newPath);

      const padding = strokeWidth / 2;
      const xs = newPath.map(p => p.x);
      const ys = newPath.map(p => p.y);
      const minX = Math.min(...xs) - padding;
      const maxX = Math.max(...xs) + padding;
      const minY = Math.min(...ys) - padding;
      const maxY = Math.max(...ys) + padding;
      const width = Math.max(maxX - minX, 1);
      const height = Math.max(maxY - minY, 1);

      const normalizedPoints = newPath.map(p => ({
        x: p.x - minX,
        y: p.y - minY
      }));

      setDrawingShape(prev => prev ? {
        ...prev,
        position: { x: minX, y: minY },
        width,
        height,
        points: normalizedPoints
      } : null);
    }
    if (!selectionBox) return;
  
    const currentPoint = getCanvasPoint(e);
    const width = currentPoint.x - selectionBox.startX;
    const height = currentPoint.y - selectionBox.startY;
    
    setSelectionBox(prev => ({
      ...prev!,
      width,
      height
    }));
  };

  const handleMouseUp = () => {
    setStartPan(null);
    setIsDragging(false);

    if (isDrawing && drawingShape && currentPath.length > 1) {
      addShape(drawingShape);
    }

    setIsDrawing(false);
    setCurrentPath([]);
    setDrawingShape(null);
    if (!selectionBox) return;

    const selectedShapeIds = shapes.filter(shape => {
      const shapeRight = shape.position.x + shape.width;
      const shapeBottom = shape.position.y + shape.height;
      
      const boxLeft = Math.min(selectionBox.startX, selectionBox.startX + selectionBox.width);
      const boxRight = Math.max(selectionBox.startX, selectionBox.startX + selectionBox.width);
      const boxTop = Math.min(selectionBox.startY, selectionBox.startY + selectionBox.height);
      const boxBottom = Math.max(selectionBox.startY, selectionBox.startY + selectionBox.height);
  
      return shape.position.x < boxRight &&
             shapeRight > boxLeft &&
             shape.position.y < boxBottom &&
             shapeBottom > boxTop;
    }).map(shape => shape.id);
  
    setSelectedShapes(selectedShapeIds);
    setSelectionBox(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

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
          stroke={isMajorLine ? '#E2E8F0' : '#F1F5F9'}
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
          stroke={isMajorLine ? '#E2E8F0' : '#F1F5F9'}
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

  return (
    <div
      ref={canvasRef}
      className={`w-full h-full overflow-hidden bg-white relative ${tool === 'pan' || spacePressed ? 'cursor-grab' :
        tool === 'pen' ? 'cursor-crosshair' : 'cursor-default'
        } ${isDragging ? '!cursor-grabbing' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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
          transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom
            }px)`,
          transformOrigin: '0 0',
        }}
      >
        {shapes?.map((shape) => (
          <ShapeComponent key={shape.id} shape={shape} />
        )) || null}
        {drawingShape && (
          <ShapeComponent shape={drawingShape} />
        )}
      </div>
      {selectionBox && (
      <div
        style={{
          position: 'absolute',
          left: Math.min(selectionBox.startX, selectionBox.startX + selectionBox.width) * zoom + offset.x,
          top: Math.min(selectionBox.startY, selectionBox.startY + selectionBox.height) * zoom + offset.y,
          width: Math.abs(selectionBox.width) * zoom,
          height: Math.abs(selectionBox.height) * zoom,
          border: '2px solid #2196f3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          pointerEvents: 'none'
        }}
      />
    )}
  </div>
);
}

