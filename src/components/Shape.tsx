import React, { useEffect, useRef, useState } from 'react';
import { RotateCw, Loader2, ChevronRight } from 'lucide-react';
import { createShapeContextMenu } from '../utils/shapeContextMenu';
import { useStore } from '../store';
import { Shape, DragStart } from '../types';
import { useBrush } from './BrushTool';
import { ShapeControls } from './ShapeControls';
import { getShapeStyles } from '../utils/shapeStyles';
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
  const imageRef = useRef<HTMLImageElement>(null);
  const sketchPadRef = useRef<HTMLCanvasElement>(null);
  const [dragStart, setDragStart] = useState<DragStart | null>(null);
  const handleMouseUp = () => {
    setResizeStart(null);
  };
  const handleStickyInteraction = () => {
    if (shape.type === 'sticky' && shape.isNew) {
      updateShape(shape.id, { isNew: false });
    }
  };

  const [rotateStart, setRotateStart] = useState<{
    angle: number;
    startRotation: number;
  } | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(false);




  const [resizeStart, setResizeStart] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    aspectRatio: number;
  } | null>(null);
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
  }, [dragStart, selectedShapes, updateShape, zoom, shapes, shape.type, shape.id, shape.groupId, isEditing]);

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
    if (!resizeStart) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeStart.x) / zoom;
      const dy = (e.clientY - resizeStart.y) / zoom;

      // Calculate new dimensions while respecting minimum size
      let newWidth = Math.max(50, resizeStart.width + dx);
      let newHeight = Math.max(50, resizeStart.height + dy);

      // Maintain aspect ratio if shift is held
      if (e.shiftKey && resizeStart.aspectRatio) {
        if (Math.abs(dx) > Math.abs(dy)) {
          newHeight = newWidth / resizeStart.aspectRatio;
        } else {
          newWidth = newHeight * resizeStart.aspectRatio;
        }
      }

      if (shape.type === 'group') {
        updateShapes([{
          id: shape.id,
          shape: {
            width: newWidth,
            height: newHeight
          }
        }]);
      } else {
        updateShape(shape.id, {
          width: newWidth,
          height: newHeight
        });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeStart, shape, shapes, updateShape, updateShapes, zoom]);

  useEffect(() => {
    if (shape.type === 'diffusionSettings') {
      updateShape(shape.id, {
        height: showAdvanced ? 550 : 170
      });
    }
  }, [shape.id, shape.type, showAdvanced, updateShape]);


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
  const aspectRatios = {
    'Landscape SD (4:3)': { width: 1176, height: 888 },
    'Widescreen IMAX (1.43:1)': { width: 1224, height: 856 },
    'Widescreen HD(16:9)': { width: 1360, height: 768 },
    'Golden Ratio (1.618:1)': { width: 1296, height: 800 },
    'Square (1:1)': { width: 1024, height: 1024 },
    'Portrait (2:3)': { width: 832, height: 1248 },
    'Portrait Standard (3:4)': { width: 880, height: 1176 },
    'Portrait Large Format (4:5)': { width: 912, height: 1144 },
    'Portrait Social Video (9:16)': { width: 768, height: 1360 },
  };
  type ModelName =
    | 'juggernautXL_v9'
    | 'RealVisXL_V4_0'
    | 'epicrealismXL_v10'
    | 'albedobaseXL_v21'
    | 'proteusV0_5'
    | 'sd_xl_base_1_0'
    | 'realismEngineSDXL_v30VAE'
    | 'copaxTimelessxlSDXL1_v122';

  const modelDefaults: Record<ModelName, {
    steps: number;
    guidanceScale: number;
    scheduler: string;
  }> = {
    juggernautXL_v9: {
      steps: 30,
      guidanceScale: 6.5,
      scheduler: 'dpmpp_2m'
    },
    RealVisXL_V4_0: {
      steps: 35,
      guidanceScale: 7.0,
      scheduler: 'dpmpp_2m_sde'
    },
    epicrealismXL_v10: {
      steps: 25,
      guidanceScale: 5.5,
      scheduler: 'euler'
    },
    albedobaseXL_v21: {
      steps: 28,
      guidanceScale: 7.5,
      scheduler: 'dpmpp_2m'
    },
    proteusV0_5: {
      steps: 32,
      guidanceScale: 8.0,
      scheduler: 'euler_ancestral'
    },
    sd_xl_base_1_0: {
      steps: 25,
      guidanceScale: 7.0,
      scheduler: 'dpmpp_2m_sde'
    },
    realismEngineSDXL_v30VAE: {
      steps: 30,
      guidanceScale: 6.0,
      scheduler: 'dpmpp_2m'
    },
    copaxTimelessxlSDXL1_v122: {
      steps: 28,
      guidanceScale: 7.0,
      scheduler: 'euler'
    }
  };


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
                handlePointerUpOrLeave();
              }}
              onPointerLeave={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
                handlePointerUpOrLeave();
              }}
              onPointerCancel={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
                handlePointerUpOrLeave();
              }}
            />
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
                    isUploading: false
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
          <div className="relative w-full h-full">
            <div className="absolute inset-0 overflow-hidden">
              <div className="h-full overflow-y-auto">

                {/* Basic Settings */}
                <div className="space-y-2 mb-3">
                  <div>
                    <label className="text-xs text-gray-600">Model</label>
                    <select
                      value={shape.model || 'juggernautXL_v9'}
                      onChange={(e) => {
                        const selectedModel = e.target.value as ModelName;
                        const defaults = modelDefaults[selectedModel];
                        updateShape(shape.id, {
                          model: selectedModel,
                          steps: defaults.steps,
                          guidanceScale: defaults.guidanceScale,
                          scheduler: defaults.scheduler
                        });
                      }}
                      className="w-full py-1 px-2 text-xs border rounded bg-white block"
                    >

                      <option value="juggernautXL_v9">Juggernaut XL v9</option>
                      <option value="RealVisXL_V4.0">RealVis XL V4.0</option>
                      <option value="epicrealismXL_v10">EpicRealism XL v10</option>
                      <option value="albedobaseXL_v21">AlbedobaseXL v21</option>
                      <option value="proteusV0.5">Proteus V0.5</option>
                      <option value="sd_xl_base_1.0">SDXL Base 1.0</option>
                      <option value="realismEngineSDXL_v30VAE">Realism Engine SDXL v3.0</option>
                      <option value="copaxTimelessxlSDXL1_v122">Copax Timeless XL v1.22</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-600">Image Dimensions</label>
                    <select
                      value={`${shape.outputWidth}x${shape.outputHeight}`}
                      onChange={(e) => {
                        const [width, height] = e.target.value.split('x').map(Number);
                        updateShape(shape.id, { outputWidth: width, outputHeight: height });
                      }}
                      className="w-full py-1 px-2 text-xs border rounded bg-white block"
                    >
                      {Object.entries(aspectRatios).map(([label, dims]) => (
                        <option key={label} value={`${dims.width}x${dims.height}`}>
                          {label} ({dims.width}x{dims.height})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Advanced Settings Toggle */}
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 mb-2"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
                  Advanced Settings
                </button>

                {/* Advanced Settings Content */}
                {showAdvanced && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-600">Steps</label>
                      <input
                        type="number"
                        value={shape.steps?.toString() || '20'}
                        onChange={(e) => updateShape(shape.id, { steps: Number(e.target.value) })}
                        min="1"
                        max="100"
                        className="w-full py-1 px-2 text-xs border rounded bg-white block"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-600">Guidance Scale</label>
                      <input
                        type="number"
                        value={shape.guidanceScale?.toString() || '7.5'}
                        onChange={(e) => updateShape(shape.id, { guidanceScale: Number(e.target.value) })}
                        className="w-full py-1 px-2 text-xs border rounded bg-white block"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-600">Scheduler</label>
                      <select
                        value={shape.scheduler || 'dpmpp_2m_sde'}
                        onChange={(e) => updateShape(shape.id, { scheduler: e.target.value })}
                        className="w-full py-1 px-2 text-xs border rounded bg-white block"
                      >
                        <option value="dpmpp_2m_sde">DPM++ 2M SDE</option>
                        <option value="dpmpp_2m">DPM++ 2M</option>
                        <option value="euler">Euler</option>
                        <option value="euler_ancestral">Euler Ancestral</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-600">Seed</label>
                      <input
                        type="number"
                        value={shape.seed?.toString() || '-1'}
                        onChange={(e) => updateShape(shape.id, { seed: Number(e.target.value) })}
                        className="w-full py-1 px-2 text-xs border rounded bg-white block"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        id={`randomize-${shape.id}`}
                        checked={shape.randomiseSeeds || false}
                        onChange={(e) => updateShape(shape.id, { randomiseSeeds: e.target.checked })}
                        className="w-3 h-3 text-blue-600 rounded border-gray-300"
                      />
                      <label htmlFor={`randomize-${shape.id}`} className="text-xs text-gray-600">
                        Randomize Seeds
                      </label>
                    </div>

                    <div>
                      <label className="text-xs text-gray-600">Output Format</label>
                      <select
                        value={shape.outputFormat || 'png'}
                        onChange={(e) => updateShape(shape.id, { outputFormat: e.target.value })}
                        className="w-full py-1 px-2 text-xs border rounded bg-white block"
                      >
                        <option value="png">PNG</option>
                        <option value="jpg">JPG</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-600">Output Quality</label>
                      <input
                        type="number"
                        value={shape.outputQuality?.toString() || '100'}
                        onChange={(e) => updateShape(shape.id, { outputQuality: Number(e.target.value) })}
                        min="1"
                        max="100"
                        className="w-full py-1 px-2 text-xs border rounded bg-white block"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {shape.type === 'image' && (
          <div className="relative w-full h-full">
            {/* Base image */}
            <img
              src={shape.imageUrl}
              alt="Original image"
              className="absolute w-full h-full object-cover"
              draggable={false}
            />

            {/* Depth layer */}
            {shape.showDepth && (
              useStore.getState().preprocessingStates[shape.id]?.depth ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                shape.depthPreviewUrl && (
                  <img
                    src={shape.depthPreviewUrl}
                    alt="Depth map"
                    className="absolute w-full h-full object-cover"
                    style={{ opacity: shape.depthStrength || 0.5 }}
                    draggable={false}
                  />
                )
              )
            )}

            {/* Edges layer */}
            {shape.showEdges && (
              useStore.getState().preprocessingStates[shape.id]?.edge ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                shape.edgePreviewUrl && (
                  <img
                    src={shape.edgePreviewUrl}
                    alt="Edge detection"
                    className="absolute w-full h-full object-cover"
                    style={{ opacity: shape.edgesStrength || 0.5 }}
                    draggable={false}
                  />
                )
              )
            )}

            {/* Pose layer */}
            {shape.showPose && (
              useStore.getState().preprocessingStates[shape.id]?.pose ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                shape.posePreviewUrl && (
                  <img
                    src={shape.posePreviewUrl}
                    alt="Pose detection"
                    className="absolute w-full h-full object-cover"
                    style={{ opacity: shape.poseStrength || 0.5 }}
                    draggable={false}
                  />
                )
              )
            )}




            {shape.showScribble && shape.scribblePreviewUrl && (
              <img
                src={shape.scribblePreviewUrl}
                alt="Scribble"
                className="absolute w-full h-full object-cover"
                style={{ opacity: shape.scribbleStrength || 0.5 }}
                draggable={false}
              />
            )}

            {shape.showRemix && shape.remixPreviewUrl && (
              <img
                src={shape.remixPreviewUrl}
                alt="Remix"
                className="absolute w-full h-full object-cover"
                style={{ opacity: shape.remixStrength || 0.5 }}
                draggable={false}
              />
            )}
          </div>



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