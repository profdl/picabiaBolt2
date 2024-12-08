import React, { useEffect, useRef, useState } from 'react';
import { RotateCw, Loader2 } from 'lucide-react';
import { createShapeContextMenu } from '../utils/shapeContextMenu';
import { useStore } from '../store';
import { Shape, DragStart } from '../types';
import { useBrush } from './BrushTool';
import { ShapeControls } from './ShapeControls';
import { getShapeStyles } from '../utils/shapeStyles';
import { DiffusionSettingsPanel } from './DiffusionSettingsPanel';
import { ImageShape } from './ImageShape';
import { useShapeResize } from '../hooks/useShapeResize';


interface ShapeProps {
  shape: Shape;
}



export function ShapeComponent({ shape }: ShapeProps) {
  const {
    selectedShapes,
    setSelectedShapes,
    updateShape,
    updateShapes,
    deleteShape,
    tool,
    zoom,
    shapes,
    sendBackward,
    sendForward,
    sendToBack,
    sendToFront,
    duplicate,
    createGroup,
    ungroup,
    setContextMenu,
    addShape,
    setTool,
    setIsEditingText
  } = useStore();

  const [isEditing, setIsEditing] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const sketchPadRef = useRef<HTMLCanvasElement>(null);
  const [dragStart, setDragStart] = useState<DragStart | null>(null);
  const { handleResizeStart, setResizeStart } = useShapeResize(
    shape,
    zoom,
    updateShape,
    updateShapes
  );


  const handleStickyInteraction = () => {
    if (shape.type === 'sticky' && shape.isNew) {
      updateShape(shape.id, { isNew: false });
    }
  };




  const [rotateStart, setRotateStart] = useState<{
    angle: number;
    startRotation: number;
  } | null>(null);

  const [showAdvanced] = useState(false);





  const { handlePointerDown, handlePointerMove, handlePointerUpOrLeave } = useBrush(sketchPadRef);
  const isSelected = selectedShapes.includes(shape.id);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === 'pan' || tool === 'pen' || isEditing) return;

    // Prevent drag when clicking controls panel
    const controlsPanel = document.querySelector(`[data-controls-panel="${shape.id}"]`);
    if (controlsPanel?.contains(e.target as Node)) {
      e.stopPropagation();
      if (!selectedShapes.includes(shape.id)) {
        setSelectedShapes([shape.id]);
      }
      return;
    }

    e.stopPropagation();
    handleStickyInteraction();

    // Store initial positions of all shapes at drag start
    const initialPositions = new Map(
      shapes.map(s => [s.id, { ...s.position }])
    );

    setDragStart({
      x: e.clientX,
      y: e.clientY,
      initialPositions
    });

    if (e.shiftKey) {
      const newSelection = selectedShapes.includes(shape.id)
        ? selectedShapes.filter(id => id !== shape.id)
        : [...selectedShapes, shape.id];
      setSelectedShapes(newSelection);
    } else if (!selectedShapes.includes(shape.id)) {
      setSelectedShapes([shape.id]);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const menuItems = createShapeContextMenu(shape, selectedShapes, {
      sendBackward,
      sendForward,
      sendToBack,
      sendToFront,
      duplicate,
      deleteShape,
      createGroup,
      ungroup
    });

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: menuItems
    });
  };

  useEffect(() => {
    if (!dragStart || isEditing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const totalDx = (e.clientX - dragStart.x) / zoom;
      const totalDy = (e.clientY - dragStart.y) / zoom;

      // Get all shapes that should move together
      let shapesToMove = selectedShapes;

      // If dragging a group, include all shapes in that group
      if (shape.type === 'group') {
        const groupedShapeIds = shapes
          .filter(s => s.groupId === shape.id)
          .map(s => s.id);
        shapesToMove = [...new Set([...selectedShapes, ...groupedShapeIds])];
      }

      // Update positions of all affected shapes
      shapesToMove.forEach(id => {
        const initialPos = dragStart.initialPositions.get(id);
        if (initialPos) {
          updateShape(id, {
            position: {
              x: initialPos.x + totalDx,
              y: initialPos.y + totalDy
            }
          });
        }
      });
    };

    const handleMouseUp = () => {
      if (dragStart && shape.groupId) {
        // Recalculate group boundaries after moving a shape within it
        const groupShape = shapes.find(s => s.id === shape.groupId);
        if (groupShape) {
          const groupedShapes = shapes.filter(s => s.groupId === shape.groupId);
          const minX = Math.min(...groupedShapes.map(s => s.position.x));
          const minY = Math.min(...groupedShapes.map(s => s.position.y));
          const maxX = Math.max(...groupedShapes.map(s => s.position.x + s.width));
          const maxY = Math.max(...groupedShapes.map(s => s.position.y + s.height));

          updateShape(shape.groupId, {
            position: { x: minX, y: minY },
            width: maxX - minX,
            height: maxY - minY
          });
        }
      }
      setDragStart(null);
      setResizeStart(null);
    };


    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragStart, selectedShapes, updateShape, zoom, shapes, shape.type, shape.id, shape.groupId, isEditing, setResizeStart]);

  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();
    }
  }, [isEditing]);
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

  useEffect(() => {
    if (shape.type === 'sketchpad' && sketchPadRef.current) {
      const updateCanvasImage = () => {
        // Create temp canvas for resizing
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          console.error('Failed to get 2D context for tempCanvas');
          return;
        }
        tempCanvas.width = 512;
        tempCanvas.height = 512;

        // Debugging: Log current canvas content before scaling
        console.log('Scaling canvas content for getCanvasImage');

        // Draw current canvas content scaled to 512x512
        tempCtx.drawImage(sketchPadRef.current, 0, 0, 512, 512);

        return tempCanvas.toDataURL('image/png');
      };

      // Only update the shape when necessary
      updateShape(shape.id, { getCanvasImage: updateCanvasImage });
    }
  }, [shape.id, shape.type, updateShape]);


  useEffect(() => {
    if (shape.type === 'diffusionSettings') {
      updateShape(shape.id, {
        height: showAdvanced ? 550 : 170
      });
    }
  }, [shape.id, shape.type, showAdvanced, updateShape]);




  if (shape.type === 'image' && shape.isUploading) {
    return (
      <div
        style={{
          position: 'absolute',
          left: shape.position.x,
          top: shape.position.y,
          width: shape.width,
          height: shape.height,
          transform: `rotate(${shape.rotation}deg)`,
          cursor: tool === 'select' ? 'move' : 'default',
          pointerEvents: tool === 'select' ? 'all' : 'none',
          zIndex: isSelected ? 1000 : shapes.findIndex(s => s.id === shape.id),
        }}
        className="animate-pulse bg-gray-200 rounded-lg flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
      >

        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        {isSelected && tool === 'select' && (
          <ShapeControls
            shape={shape}
            isSelected={isSelected}
            isEditing={isEditing}
            handleResizeStart={handleResizeStart}
          />
        )}
      </div>
    );
  }

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


  const handleDoubleClick = (e: React.MouseEvent) => {
    if (shape.type === 'text' || shape.type === 'sticky') {
      e.stopPropagation();
      setIsEditing(true);
      setIsEditingText(true);
      handleStickyInteraction();
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
        onContextMenu={handleContextMenu}
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
  const shapeStyles = getShapeStyles(shape, isSelected, shapes, tool);




  return (
    <div style={{ position: 'absolute', width: 0, height: 0 }}>
      <div
        id={shape.id}
        style={{
          ...shapeStyles,
          overflow: 'hidden',
          pointerEvents: tool === 'select' ? 'all' : 'none',
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        tabIndex={0}
        className="group transition-shadow hover:shadow-xl relative"
      >
        {shape.type === 'sketchpad' && (
          <>
            <div className="absolute -top-6 left-0 text-sm text-gray-300 font-medium">
              SketchPad
            </div>
            <canvas
              ref={sketchPadRef}
              width={512}
              height={512}
              className="w-full h-full touch-none"
              onContextMenu={handleContextMenu}
              style={{
                pointerEvents: (tool === 'select' || tool === 'brush' || tool === 'eraser') ? 'all' : 'none',
                backgroundColor: '#000000',
                touchAction: 'none',
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                handlePointerDown(e);
              }}
              onPointerMove={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handlePointerMove(e);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                e.preventDefault();
                e.currentTarget.releasePointerCapture(e.pointerId);
                handlePointerUpOrLeave(e);  // Pass the event
              }}
              onPointerLeave={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
                handlePointerUpOrLeave(e);  // Pass the event
              }}
              onPointerCancel={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
                handlePointerUpOrLeave(e);  // Pass the event
              }} />
            {tool === 'brush' && (
              <button
                className="absolute -bottom-6 right-0 text-xs px-1.5 py-0.5 bg-gray-300 text-gray-800 rounded hover:bg-red-600 transition-colors"
                style={{ pointerEvents: 'all' }}
                onClick={(e) => {
                  e.stopPropagation();
                  const newId = Math.random().toString(36).substr(2, 9);
                  addShape({
                    id: newId,
                    type: 'sketchpad',
                    position: shape.position,
                    width: shape.width,
                    height: shape.height,
                    color: '#ffffff',
                    rotation: shape.rotation,
                    locked: true,
                    isUploading: false,
                    isEditing: false,
                    model: '',
                    useSettings: false,
                    depthStrength: 0,
                    edgesStrength: 0,
                    contentStrength: 0,
                    poseStrength: 0,
                    scribbleStrength: 0,
                    remixStrength: 0
                  });
                  deleteShape(shape.id);
                  setTool('brush');
                }}
              >
                Clear
              </button>
            )}
          </>
        )}

        {shape.type === 'diffusionSettings' && (
          <DiffusionSettingsPanel
            shape={shape}
            updateShape={updateShape}
            onAdvancedToggle={(isExpanded) => {
              updateShape(shape.id, {
                height: isExpanded ? 550 : 170
              });
            }}
          />
        )}



        {shape.type === 'image' && (
          <ImageShape shape={shape} />
        )}

        <textarea
          ref={textRef}
          value={shape.content || ''}
          onChange={(e) => updateShape(shape.id, { content: e.target.value })}
          onBlur={() => setIsEditing(false)}
          onMouseDown={(e) => {
            if (isEditing) {
              e.stopPropagation();
            }
          }}
          className={`w-full h-full bg-transparent resize-none outline-none text-left ${isEditing ? '' : 'pointer-events-none'
            }`}
          style={{ fontSize: shape.fontSize || 16, scrollbarWidth: 'thin', }}
          readOnly={!isEditing}
        />

      </div>

      {/* Controls layer */}
      {tool === 'select' && (
        <div
          data-controls-panel={shape.id}
          style={{
            position: 'absolute',
            left: shape.position.x,
            top: shape.position.y,
            width: shape.width,
            height: shape.height,
            transform: `rotate(${shape.rotation || 0}deg)`,
            zIndex: isSelected ? 101 : 2,
            pointerEvents: 'none',
          }}
        >
          <ShapeControls
            shape={shape}
            isSelected={isSelected}
            isEditing={isEditing}
            handleResizeStart={handleResizeStart}
          />
        </div>
      )}
    </div>
  );
}