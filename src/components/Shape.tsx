import React, { useEffect, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { useStore } from '../store';
import { Shape } from '../types';

interface ShapeProps {
  shape: Shape;
}

export function ShapeComponent({ shape }: ShapeProps) {
  const { 
    selectedShapes, 
    setSelectedShapes, 
    updateShape, 
    deleteShape, 
    tool, 
    zoom,
    shapes 
  } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [dragStart, setDragStart] = useState<{
    x: number;
    y: number;
    initialPosition: Position;
  } | null>(null);
  const [rotateStart, setRotateStart] = useState<{
    angle: number;
    startRotation: number;
  } | null>(null);
  const [resizeStart, setResizeStart] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    aspectRatio: number;
  } | null>(null);

  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();
      textRef.current.select();
    }
  }, [isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === 'pan' || tool === 'pen') return;
    e.stopPropagation();

    const initialPosition = { ...shape.position };
    const currentSelected = Array.isArray(selectedShapes) ? selectedShapes : [];

    if (e.shiftKey) {
      const newSelection = currentSelected.includes(shape.id) 
        ? currentSelected.filter(id => id !== shape.id)
        : [...currentSelected, shape.id];
      
      setSelectedShapes(newSelection);
      
      // Set dragStart immediately if shape is in the new selection
      if (newSelection.includes(shape.id)) {
        setDragStart({
          x: e.clientX,
          y: e.clientY,
          initialPosition
        });
      }
    } else {
      if (!currentSelected.includes(shape.id)) {
        setSelectedShapes([shape.id]);
      }
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        initialPosition
      });
    }
  };

  useEffect(() => {
    if (!dragStart) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.x) / zoom;
      const dy = (e.clientY - dragStart.y) / zoom;

      if (Array.isArray(selectedShapes) && selectedShapes.includes(shape.id)) {
        // Store initial positions of all selected shapes
        const initialPositions = new Map(
          selectedShapes.map(id => {
            const shape = shapes.find(s => s.id === id);
            return [id, shape?.position];
          })
        );

        // Update each selected shape maintaining relative positions
        selectedShapes.forEach(id => {
          const initialPos = initialPositions.get(id);
          if (initialPos) {
            updateShape(id, {
              position: {
                x: initialPos.x + dx,
                y: initialPos.y + dy
              }
            });
          }
        });
      }
    };

    const handleMouseUp = () => {
      setDragStart(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragStart, selectedShapes, updateShape, shape.id, zoom]);

  const handleRotateStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);

    setRotateStart({
      angle: startAngle,
      startRotation: shape.rotation || 0
    });
  };

  useEffect(() => {
    if (!rotateStart) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = document.getElementById(shape.id)?.getBoundingClientRect();
      if (!rect) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const angleDiff = (currentAngle - rotateStart.angle) * (180 / Math.PI);
      const newRotation = (rotateStart.startRotation + angleDiff) % 360;

      updateShape(shape.id, { rotation: newRotation });
    };

    const handleMouseUp = () => {
      setRotateStart(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [rotateStart, shape.id, updateShape]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: shape.width,
      height: shape.height,
      aspectRatio: shape.width / shape.height
    });
  };

  useEffect(() => {
    if (!resizeStart) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeStart.x) / zoom;
      const dy = (e.clientY - resizeStart.y) / zoom;

      let newWidth = Math.max(50, resizeStart.width + dx);
      let newHeight = Math.max(50, resizeStart.height + dy);

      if (e.shiftKey || (shape.type === 'image' && shape.aspectRatio)) {
        if (Math.abs(dx) > Math.abs(dy)) {
          newHeight = newWidth / resizeStart.aspectRatio;
        } else {
          newWidth = newHeight * resizeStart.aspectRatio;
        }
      }

      updateShape(shape.id, {
        width: newWidth,
        height: newHeight
      });
    };

    const handleMouseUp = () => {
      setResizeStart(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeStart, shape.type, shape.aspectRatio, updateShape, zoom]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (shape.type === 'text' || shape.type === 'sticky') {
      e.stopPropagation();
      setIsEditing(true);
    } else if (shape.type === 'image') {
      e.stopPropagation();
      const newUrl = window.prompt('Enter image URL:', shape.imageUrl);
      if (newUrl) {
        updateShape(shape.id, { imageUrl: newUrl });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedShapes.includes(shape.id) && e.key === 'Delete') {
      deleteShape(shape.id);
    }
  };

  const isSelected = selectedShapes.includes(shape.id);

  if (shape.type === 'drawing') {
    return (
      <div
        id={shape.id}
        style={{
          position: 'absolute',
          left: shape.position.x,
          top: shape.position.y,
          width: shape.width,
          height: shape.height,
          cursor: tool === 'select' ? 'move' : 'default',
          transform: `rotate(${shape.rotation || 0}deg)`,
          transformOrigin: 'center center',
          zIndex: isSelected ? 100 : 1,
          pointerEvents: tool === 'select' ? 'all' : 'none',
        }}
        onMouseDown={handleMouseDown}
        className={isSelected ? 'selected' : ''}
      >
        <svg
          width="100%"
          height="100%"
          style={{
            overflow: 'visible',
          }}
        >
          <path
            d={`M ${shape.points?.map(p => `${p.x},${p.y}`).join(' L ')}`}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {isSelected && tool === 'select' && (
          <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
            <div
              className="absolute -right-2 -bottom-2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-se-resize"
              style={{ zIndex: 101, pointerEvents: 'all' }}
              onMouseDown={handleResizeStart}
            />
            <div
              className="absolute w-6 h-6 bg-white border-2 border-blue-500 rounded-full cursor-pointer hover:bg-blue-50 flex items-center justify-center"
              style={{
                left: '50%',
                top: -32,
                transform: 'translateX(-50%)',
                zIndex: 101,
                pointerEvents: 'all'
              }}
              onMouseDown={handleRotateStart}
            >
              <RotateCw className="w-4 h-4 text-blue-500" />
            </div>
          </div>
        )}
      </div>
    );
  }

  const shapeStyles: React.CSSProperties = {
    position: 'absolute',
    left: shape.position.x,
    top: shape.position.y,
    width: shape.width,
    height: shape.height,
    backgroundColor: shape.type === 'image' || shape.color === 'transparent' 
    ? 'transparent' 
    : shape.color,    cursor: tool === 'select' ? 'move' : 'default',
    border: isSelected ? '2px solid #2196f3' : 'none',
    borderRadius: shape.type === 'circle' ? '50%' : shape.type === 'sticky' ? '8px' : '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    fontSize: shape.fontSize || 16,
    padding: '8px',
    boxShadow: shape.type === 'sticky' ? '0 4px 6px rgba(0, 0, 0, 0.1)' : undefined,
    overflow: 'hidden',
    transform: `rotate(${shape.rotation || 0}deg)`,
    transformOrigin: 'center center',
    transition: 'box-shadow 0.2s ease-in-out',
    zIndex: isSelected ? 100 : 1,
    pointerEvents: tool === 'select' ? 'all' : 'none',
  };

  return (
    <div
      id={shape.id}
      style={shapeStyles}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="group transition-shadow hover:shadow-xl relative"
    >
      {shape.type === 'image' && shape.imageUrl ? (
        <img
          ref={imageRef}
          src={shape.imageUrl}
          alt="User uploaded content"
          className="w-full h-full object-cover"
          onLoad={() => {
            if (imageRef.current && !shape.aspectRatio) {
              const ratio = imageRef.current.naturalWidth / imageRef.current.naturalHeight;
              updateShape(shape.id, { aspectRatio: ratio });
            }
          }}
          draggable={false}
        />
      ) : isEditing ? (
        <textarea
          ref={textRef}
          value={shape.content || ''}
          onChange={(e) => updateShape(shape.id, { content: e.target.value })}
          onBlur={() => setIsEditing(false)}
          className="w-full h-full bg-transparent resize-none outline-none text-center"
          style={{ fontSize: shape.fontSize || 16 }}
        />
      ) : (
        shape.content
      )}

      {isSelected && !isEditing && tool === 'select' && (
        <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
          <div
            className="absolute -right-2 -bottom-2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-se-resize"
            style={{ zIndex: 101, pointerEvents: 'all' }}
            onMouseDown={handleResizeStart}
          />
          <div
            className="absolute w-6 h-6 bg-white border-2 border-blue-500 rounded-full cursor-pointer hover:bg-blue-50 flex items-center justify-center"
            style={{
              left: '50%',
              top: -32,
              transform: 'translateX(-50%)',
              zIndex: 101,
              pointerEvents: 'all'
            }}
            onMouseDown={handleRotateStart}
          >
            <RotateCw className="w-4 h-4 text-blue-500" />
          </div>
          <input
            type="color"
            value={shape.color}
            onChange={(e) => updateShape(shape.id, { color: e.target.value })}
            className="absolute -left-8 top-1/2 w-6 h-6 cursor-pointer transform -translate-y-1/2"
            style={{ zIndex: 101, pointerEvents: 'all' }}
          />
        </div>
      )}
    </div>
  );
}