import React, { useEffect, useRef, useState } from "react";
import { createShapeContextMenu } from "../../utils/shapeContextMenu";
import { useStore } from "../../store";
import { Shape,  } from "../../types";
import { useBrush } from "../layout/toolbars/BrushTool";
import { ShapeControls } from "./ShapeControls";
import { getShapeStyles } from "../../utils/shapeStyles";
import { DiffusionSettingsPanel } from "./shapetypes/DiffusionSettingsPanel";
import { ImageShape } from "./shapetypes/ImageShape";
import { useShapeResize } from "../../hooks/useShapeResize";
import { DrawingShape } from "./shapetypes/DrawingShape";
import { SketchpadShape } from "./shapetypes/SketchpadShape";
import { LoadingPlaceholder } from "../shared/LoadingPlaceholder";
import { ThreeJSShape, ThreeJSShapeRef } from "./shapetypes/ThreeJSShape";
import { uploadCanvasToSupabase } from "../../utils/canvasUtils";
import { useShapeDrag } from "../../hooks/useShapeDrag";

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
    setIsEditingText,
    generatingPredictions,
  } = useStore();
  const threeJSRef = useRef<ThreeJSShapeRef>(null);

  const [isEditing, setIsEditing] = useState(false);
  const { initDragStart } = useShapeDrag({
    shape,
    isEditing,
    zoom
  });
  const textRef = useRef<HTMLTextAreaElement>(null);
  const sketchPadRef = useRef<HTMLCanvasElement>(null);
  const { handleResizeStart,  } = useShapeResize(
    shape,
    zoom,
    updateShape,
    updateShapes
  );

  const handleSketchpadPointerDown = (
    e: React.PointerEvent<HTMLCanvasElement>
  ) => {
    if (handlePointerDown) {
      handlePointerDown(e);
    }
  };

  const handleSketchpadPointerMove = (
    e: React.PointerEvent<HTMLCanvasElement>
  ) => {
    if (handlePointerMove) {
      handlePointerMove(e);
    }
  };

  const handleSketchpadPointerUpOrLeave = () => {
    if (handlePointerUpOrLeave) {
      handlePointerUpOrLeave();
    }
  };

  const handleStickyInteraction = () => {
    if (shape.type === "sticky" && shape.isNew) {
      updateShape(shape.id, { isNew: false });
    }
  };

  const [rotateStart, setRotateStart] = useState<{
    angle: number;
    startRotation: number;
  } | null>(null);

  const { handlePointerDown, handlePointerMove, handlePointerUpOrLeave } =
    useBrush(sketchPadRef);
  const isSelected = selectedShapes.includes(shape.id);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent shape dragging if the shape is in orbit mode
    if (shape.type === "3d" && shape.isOrbiting) {
      e.stopPropagation();
      return;
    }
  
    if (tool === "pan" || (isEditing && !shape.isNew)) return;
  
    // Prevent drag when clicking controls panel
    const controlsPanel = document.querySelector(
      `[data-controls-panel="${shape.id}"]`
    );
    if (controlsPanel?.contains(e.target as Node)) {
      e.stopPropagation();
      if (!selectedShapes.includes(shape.id)) {
        setSelectedShapes([shape.id]);
      }
      return;
    }
  
    e.stopPropagation();
    handleStickyInteraction();
  
    // Initialize drag
    initDragStart(e);
  
    if (e.shiftKey) {
      const newSelection = selectedShapes.includes(shape.id)
        ? selectedShapes.filter((id) => id !== shape.id)
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
      ungroup,
    });

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: menuItems,
    });
  };



  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();
      const length = textRef.current.value.length;
      textRef.current.setSelectionRange(length, length);
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

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [rotateStart, shape.id, updateShape]);

  useEffect(() => {
    if (shape.type === "sketchpad" && sketchPadRef.current) {
      const updateCanvasImage = () => {
        const canvas = sketchPadRef.current;
        if (!canvas) return undefined;
        return canvas.toDataURL("image/png");
      };

      updateShape(shape.id, { getCanvasImage: updateCanvasImage });
    }
  }, [shape.id, shape.type, updateShape]);

  if (shape.type === "image" && shape.isUploading) {
    const isGenerating = generatingPredictions.has(shape.id);

    return (
      <div
        style={{
          position: "absolute",
          left: shape.position.x,
          top: shape.position.y,
          width: shape.width,
          height: shape.height,
          transform: `rotate(${shape.rotation}deg)`,
          cursor: tool === "select" ? "move" : "default",
          pointerEvents: tool === "select" ? "all" : "none",
          zIndex: isSelected
            ? 1000
            : shapes.findIndex((s) => s.id === shape.id),
        }}
        className="bg-gray-200 rounded-lg flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
      >
        <LoadingPlaceholder isGenerating={isGenerating} />
        {isSelected && tool === "select" && (
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
      startRotation: shape.rotation || 0,
    });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (shape.type === "3d") {
      e.stopPropagation();
      updateShape(shape.id, { isOrbiting: true });
      setIsEditingText(true);
      return;
    }

    if (shape.type === "text" || shape.type === "sticky") {
      e.stopPropagation();
      setIsEditing(true);
      setIsEditingText(true);
      handleStickyInteraction();

      // Clear default text on first edit
      if (shape.content === "Double-Click to Edit...") {
        updateShape(shape.id, { content: "" });
      }

      if (textRef.current) {
        textRef.current.focus();
        textRef.current.select();
      }
    } else if (shape.type === "image") {
      e.stopPropagation();
      updateShape(shape.id, { isImageEditing: true });
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    setIsEditingText(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedShapes.includes(shape.id)) {
      if (e.key === "Delete") {
        deleteShape(shape.id);
      } else if (e.shiftKey && e.key === "Enter") {
        setIsEditing(false);
        setIsEditingText(false);
        setSelectedShapes([]);
      }
    }
  };

  if (shape.type === "drawing") {
    return (
      <DrawingShape
        shape={shape}
        isSelected={isSelected}
        tool={tool}
        handleMouseDown={handleMouseDown}
        handleContextMenu={handleContextMenu}
        handleResizeStart={handleResizeStart}
        handleRotateStart={handleRotateStart}
      />
    );
  }

  if (shape.type === "3d") {
    return (
      <div
        style={{
          position: "absolute",
          left: shape.position.x,
          top: shape.position.y,
          width: shape.width,
          height: shape.height,
          transform: `rotate(${shape.rotation}deg)`,
          cursor: tool === "select" ? "move" : "default",
          pointerEvents: tool === "select" ? "all" : "none",
          zIndex: isSelected
            ? 1000
            : shapes.findIndex((s) => s.id === shape.id),
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <ThreeJSShape ref={threeJSRef} shape={shape} />
        {isSelected && tool === "select" && (
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

  const shapeStyles = getShapeStyles(
    shape,
    isSelected,
    shapes,
    tool,
    isEditing
  );

  return (
    <div style={{ position: "absolute", width: 0, height: 0 }}>
      <div
        id={shape.id}
        style={{
          ...shapeStyles,
          overflow: "hidden",
          pointerEvents: tool === "select" ? "all" : "none",
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        tabIndex={0}
        className={`group transition-shadow hover:shadow-xl relative ${
          isEditing ? "ring-2 ring-blue-500 ring-opacity-50" : ""
        }`}
      >
        {shape.type === "sketchpad" && (
          <SketchpadShape
            shape={shape}
            sketchPadRef={sketchPadRef}
            handlePointerDown={handleSketchpadPointerDown}
            handlePointerMove={handleSketchpadPointerMove}
            handlePointerUpOrLeave={handleSketchpadPointerUpOrLeave}
            handleContextMenu={handleContextMenu}
            tool={tool}
            uploadCanvasToSupabase={uploadCanvasToSupabase}
            onClear={() => shape.onClear?.()}
          />
        )}

        {shape.type === "diffusionSettings" && (
          <DiffusionSettingsPanel
            shape={shape}
            updateShape={updateShape}
            onAdvancedToggle={(isExpanded) => {
              updateShape(shape.id, {
                height: isExpanded ? 550 : 170,
              });
            }}
          />
        )}
        {shape.type === "image" && <ImageShape shape={shape} />}
        <textarea
          ref={textRef}
          value={shape.content || ""}
          onChange={(e) => updateShape(shape.id, { content: e.target.value })}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onMouseDown={(e) => {
            if (!isEditing) {
              e.stopPropagation();
            }
          }}
          className={`w-full h-full bg-transparent resize-none outline-none text-left ${
            isEditing ? "cursor-text" : "cursor-default pointer-events-none"
          }`}
          style={{
            fontSize: shape.fontSize || 16,
            scrollbarWidth: "thin",
            cursor: isEditing ? "text" : "move",
          }}
          readOnly={!isEditing}
        />
      </div>
      {/* Controls layer */}
      {(tool === "select" ||
        (shape.type === "sketchpad" &&
          (tool === "brush" || tool === "eraser"))) && (
        <div
          data-controls-panel={shape.id}
          style={{
            position: "absolute",
            left: shape.position.x,
            top: shape.position.y,
            width: shape.width,
            height: shape.height,
            transform: `rotate(${shape.rotation || 0}deg)`,
            zIndex: isSelected ? 101 : 2,
            pointerEvents: "none",
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
