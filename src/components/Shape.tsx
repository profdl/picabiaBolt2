import React, { useEffect, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { useStore } from '../store';
import { useBrush } from './BrushTool';
import { ShapeControls } from './ShapeControls';

export interface Shape {
  showPrompt: boolean | undefined;
  strokeWidth: number | undefined;
  id: string;
  type: 'rectangle' | 'circle' | 'text' | 'sticky' | 'image' | 'canvas' | 'drawing';
  position: { x: number; y: number };
  width: number;
  height: number;
  color: string;
  rotation: number;
  imageUrl?: string;
  aspectRatio?: number;
  content?: string;
  fontSize?: number;
  locked?: boolean;
  getCanvasImage?: () => string;
  promptStrength?: number;
  points?: { x: number; y: number }[];
  isGenerating: boolean;
}

interface ShapeProps {
  shape: Shape;
}

export function ShapeComponent({ shape }: ShapeProps) {
  shape.isGenerating = shape.isGenerating ?? false;
  const {
    selectedShapes,
    setSelectedShapes,
    updateShape,
    deleteShape,
    tool,
    zoom,
    shapes,
  } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [dragStart, setDragStart] = useState<{
    x: number;
    y: number;
    initialPosition: { x: number; y: number };
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

  useEffect(() => {
    if (shape.type === 'canvas' && canvasRef.current) {
      updateShape(shape.id, {
        getCanvasImage: () => {
          // Create temp canvas for resizing
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          tempCanvas.width = 512;
          tempCanvas.height = 512;

          // Draw current canvas content scaled to 512x512
          if (canvasRef.current) {
            if (tempCtx) {
              tempCtx.drawImage(canvasRef.current, 0, 0, 512, 512);
            }
          }

          return tempCanvas.toDataURL('image/png');
        }
      } as Partial<Shape>);
    }
  }, [shape.id, shape.type, updateShape]);
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
  }, [dragStart, selectedShapes, updateShape, shape.id, zoom, shapes]);

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

    <input
      type="range"
      min="0"
      max="1"
      step="0.05"
      value={shape.promptStrength ?? 0.8}  // Use nullish coalescing
      onChange={(e) => {
        e.stopPropagation();
        updateShape(shape.id, {
          promptStrength: parseFloat(e.target.value)
        } as Partial<Shape>);
      }} onMouseDown={(e) => e.stopPropagation()}
      className="w-full"
    />
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeStart, shape.type, shape.aspectRatio, updateShape, zoom, shape.id, shape.promptStrength]);

  // Moved the input element outside of the useEffect
  <input
    type="range"
    min="0"
    max="1"
    step="0.05"
    value={shape.promptStrength ?? 0.8}
    onChange={(e) => {
      e.stopPropagation();
      updateShape(shape.id, {
        promptStrength: parseFloat(e.target.value) as number
      } as Partial<Shape>);
    }}
    onMouseDown={(e) => e.stopPropagation()}
    className="w-full"
  />

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

  const { handlePointerDown, handlePointerMove, handlePointerUpOrLeave } = useBrush(canvasRef);

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
      : shape.color,
    cursor: tool === 'select' ? 'move' : 'default',
    border: shape.type === 'canvas'
      ? '2px dashed #e5e7eb'
      : isSelected
        ? '2px solid #2196f3'
        : 'none',
    borderRadius: shape.type === 'circle' ? '50%' : shape.type === 'sticky' ? '8px' : '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    fontSize: shape.fontSize || 16,
    padding: '8px',
    boxShadow: shape.type === 'sticky' ? '0 4px 6px rgba(0, 0, 0, 0.1)' : undefined,
    overflow: 'visible',
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
      {/* Image and content rendering */}
      {shape.type === 'canvas' && (
        <>
          <div className="absolute -top-6 left-0 text-sm text-gray-300 font-medium ">
            Canvas
          </div>
          <canvas
            ref={canvasRef}
            width={512}
            height={512}
            className="w-full h-full"
            style={{
              pointerEvents: (tool === 'select' || tool === 'brush') ? 'all' : 'none',
              backgroundColor: '#e5e7eb',
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              handlePointerDown(e);
            }}
            onPointerMove={(e) => {
              e.stopPropagation();
              handlePointerMove(e);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              handlePointerUpOrLeave();
            }}
            onPointerLeave={(e) => {
              e.stopPropagation();
              handlePointerUpOrLeave();
            }}
          />
        </>
      )}
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
      {/* Selection controls */}
      {isSelected && !isEditing && tool === 'select' && (
        <ShapeControls
          shape={shape}
          isSelected={isSelected}
          isEditing={isEditing}
          handleResizeStart={handleResizeStart}
          handleRotateStart={handleRotateStart}
        />
      )}

      {/* Separate image prompt controls */}
      {(shape.type === 'image' || shape.type === 'canvas') && (shape.showPrompt || isSelected) && (
        <div
          className="absolute left-1/2 top-full mt-2 bg-white p-2 rounded border border-gray-200 transform -translate-x-1/2"
          style={{ zIndex: 101, pointerEvents: 'all', width: '180px' }}
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`prompt-${shape.id}`}
                checked={shape.showPrompt}
                onChange={(e) => {
                  if (e.target.checked) {
                    shapes.forEach(otherShape => {
                      if ((otherShape.type === 'image' || otherShape.type === 'canvas') && otherShape.showPrompt) {
                        updateShape(otherShape.id, { showPrompt: false });
                      }
                    });
                  }
                  updateShape(shape.id, { showPrompt: e.target.checked });
                }}
                className="cursor-pointer"
              />
              <label
                htmlFor={`prompt-${shape.id}`}
                className="text-sm text-gray-700 cursor-pointer whitespace-nowrap"
              >
                Image Prompt
              </label>
            </div>

            {shape.showPrompt && (
              <div className="space-y-1">
                <label className="block text-xs text-gray-600">
                  Prompt Strength ({shape.promptStrength || 0.8})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={shape.promptStrength || 0.8}
                  onChange={(e) => updateShape(shape.id, {
                    promptStrength: parseFloat(e.target.value)
                  } as Partial<Shape>)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      )}
      {shape.type === 'sticky' && (shape.showPrompt || isSelected) && (
        <div
          className="absolute left-1/2 top-full mt-2 bg-white p-2 rounded border border-gray-200 transform -translate-x-1/2"
          style={{ zIndex: 101, pointerEvents: 'all', width: '180px' }}
        >
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`prompt-${shape.id}`}
              checked={shape.showPrompt}
              onChange={(e) => {
                if (e.target.checked) {
                  shapes.forEach(otherShape => {
                    if (otherShape.type === 'sticky' && otherShape.showPrompt) {
                      updateShape(otherShape.id, { showPrompt: false });
                    }
                  });
                }
                updateShape(shape.id, { showPrompt: e.target.checked });
              }}
              className="cursor-pointer"
            />
            <label
              htmlFor={`prompt-${shape.id}`}
              className="text-sm text-gray-700 cursor-pointer whitespace-nowrap"
            >
              Text Prompt
            </label>
          </div>
        </div>
      )}    </div>
  );
}

