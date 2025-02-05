// src/components/shapes/Shape.tsx
import { useEffect, useRef, useState } from "react";
import { useStore } from "../../store";
import { Shape } from "../../types";
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
import { useSketchpadEvents } from "../../hooks/useSketchpadEvents";
import { useSketchpadShapeEvents } from "../../hooks/sketchpadShapeEvents";
import { useShapeEvents } from "../../hooks/useShapeEvents";
import { useThemeClass } from "../../styles/useThemeClass";

interface ShapeProps {
  shape: Shape;
}

export function ShapeComponent({ shape }: ShapeProps) {


  const styles = {
    base: useThemeClass(['shape', 'base']),
    selected: useThemeClass(['shape', 'selected']),
    container: useThemeClass(['shape', 'container']),
    controls: {
      panel: useThemeClass(['shape', 'controls', 'panel']),
      group: useThemeClass(['shape', 'controls', 'group']),
      checkbox: useThemeClass(['shape', 'controls', 'checkbox']),
      label: useThemeClass(['shape', 'controls', 'label']),
      slider: useThemeClass(['shape', 'controls', 'slider']),
      tooltip: useThemeClass(['shape', 'controls', 'tooltip'])
    },
    resizeHandle: useThemeClass(['shape', 'resizeHandle']),
    colorPicker: useThemeClass(['shape', 'colorPicker']),
    textArea: useThemeClass(['shape', 'textArea']),
    newOverlay: {
      container: useThemeClass(['shape', 'newOverlay', 'container']),
      text: useThemeClass(['shape', 'newOverlay', 'text'])
    },
    sidePanel: {
      container: useThemeClass(['shape', 'sidePanel', 'container']),
      group: useThemeClass(['shape', 'sidePanel', 'group']),
      checkbox: useThemeClass(['shape', 'sidePanel', 'checkbox']),
      label: useThemeClass(['shape', 'sidePanel', 'label'])
    }
  };


  const {
    selectedShapes,
    shapes,
    updateShape,
    updateShapes,
    tool,
    zoom,
    generatingPredictions,
    setIsEditingText,
    setSelectedShapes,
  } = useStore();

  const [isEditing, setIsEditing] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const threeJSRef = useRef<ThreeJSShapeRef>(null);
  const sketchPadRef = useRef<HTMLCanvasElement>(null);

  const { initDragStart } = useShapeDrag({
    shape,
    isEditing,
    zoom,
  });

  const { handleResizeStart } = useShapeResize(
    shape,
    zoom,
    updateShape,
    updateShapes
  );

  useSketchpadShapeEvents({ shape, sketchPadRef });

  const {
    handleMouseDown,
    handleContextMenu,
    handleDoubleClick,
    handleKeyDown,
    handleRotateStart,
  } = useShapeEvents({
    shape,
    isEditing,
    isSelected: selectedShapes.includes(shape.id),
    zoom,
    textRef,
    initDragStart,
  });

  const { handlePointerDown, handlePointerMove, handlePointerUpOrLeave } =
    useBrush(sketchPadRef);

  const {
    handleSketchpadPointerDown,
    handleSketchpadPointerMove,
    handleSketchpadPointerUpOrLeave,
  } = useSketchpadEvents({
    handlePointerDown,
    handlePointerMove,
    handlePointerUpOrLeave,
  });

  const isSelected = selectedShapes.includes(shape.id);

  const handleBlur = () => {
    if (shape.type === "sticky" || shape.type === "text") {
      // Only update if there's actual content
      if (!shape.content?.trim()) {
        updateShape(shape.id, {
          content: "Double-Click to Edit...",
          isEditing: false,
        });
      } else {
        updateShape(shape.id, { isEditing: false });
      }
      setIsEditing(false);
      setIsEditingText(false);
      // Deselect the shape when losing focus
      setSelectedShapes([]);
    }
  };


  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();
      const length = textRef.current.value.length;
      textRef.current.setSelectionRange(length, length);
    }
  }, [isEditing]);

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
    <div
      style={{ position: "absolute", width: 0, height: 0 }}
    >
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
        className={`${styles.base} ${isEditing ? styles.selected : ''}`}
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
  
        {(shape.type === "text" || shape.type === "sticky") && (
    <textarea
      ref={textRef}
      value={shape.content || ""}
      onChange={(e) => updateShape(shape.id, { content: e.target.value })}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        e.stopPropagation();
        if (shape.type === "sticky" && !isEditing) {
          setIsEditing(true);
          setIsEditingText(true);
          updateShape(shape.id, { isEditing: true });
        }
      }}
      className={`${styles.textArea} ${isEditing ? "cursor-text" : "cursor-move"} ${
        shape.type === "sticky" ? "text-neutral-800" : "text-neutral-800 dark:text-neutral-100"
      }`}
      style={{
        fontSize: shape.fontSize || 16,
        scrollbarWidth: "thin",
        pointerEvents: "all",
      }}
      readOnly={!isEditing}
      spellCheck={false}
    />
  )}
      </div>
  
      {/* New Sticky Note Overlay */}
      {shape.type === "sticky" && shape.isNew && (
        <div className={styles.newOverlay.container}>
          <div className={styles.newOverlay.text}>
            Double-click to edit
          </div>
        </div>
      )}
  
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
          className={styles.container}
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