// src/components/shapes/Shape.tsx
import { useEffect, useRef } from "react";
import { useStore } from "../../store";
import { Shape } from "../../types";
import { useDarkMode } from "../../hooks/ui/useDarkMode";
import { useShapeDrag } from "../../hooks/shapes/useShapeDrag";
import { useShapeResize } from "../../hooks/shapes/useShapeResize";
import { useShapeEvents } from "../../hooks/shapes/useShapeEvents";
import { getShapeStyles } from "../../utils/shapeStyles";
import { ShapeControls } from "./ShapeControls";
import { ImageShape } from "./shapetypes/ImageShape";
import { Loader2 } from "lucide-react";
import { ProcessedShape } from "./shapetypes/ProcessedShape";
import { DiffusionSettingsPanel } from "./shapetypes/DiffusionSettingsPanel";
import { StickyNoteShape } from "./shapetypes/StickyNoteShape";

import { useStickyNoteColor } from "../../hooks/ui/useStickyNoteColor";
import { useThemeClass } from "../../styles/useThemeClass";

interface ShapeProps {
  shape: Shape;
}

const LoadingPlaceholder: React.FC<{ isGenerating: boolean; logs?: string[] }> = ({ isGenerating, logs }) => {
  // Process logs to preserve all content
  const getProcessedLogs = (logs: string[] | string | undefined) => {
    if (!logs) return [];
    return typeof logs === 'string' ? logs.split('\n') : logs;
  };

  const processedLogs = getProcessedLogs(logs);
  const logsRef = useRef<HTMLPreElement>(null);
  
  // Detect server state from logs
  const getServerState = (logs: string[]) => {
    const lastLogs = logs.join(' ');
    if (lastLogs.includes('Starting server')) {
      return 'Server is starting up...';
    }
    if (lastLogs.includes('queue_full') || lastLogs.includes('in queue')) {
      return 'Waiting in queue...';
    }
    return isGenerating ? 'Generating...' : 'Processing...';
  };

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [processedLogs]);
  
  return (
    <div className="flex flex-col items-stretch w-full h-full bg-[#1C1C1C] rounded-lg p-3">
      <div className="flex-grow flex flex-col items-center justify-center">
        <div className="flex items-center justify-center mb-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-400 mr-2" />
          <span className="text-[14px] font-medium text-gray-400">
            {getServerState(processedLogs)}
          </span>
        </div>
      </div>
      <pre 
        ref={logsRef}
        className="bg-[#1C1C1C] text-gray-400 px-6 py-3 m-0 text-[16px] leading-7 font-sans overflow-x-hidden overflow-y-scroll scrollbar-none whitespace-pre-wrap break-all h-[120px]"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {processedLogs.length > 0 ? processedLogs.map((log, i) => {
          // Highlight important server states in the logs
          const isServerBoot = log.includes('Starting server');
          const isQueueState = log.includes('queue_full') || log.includes('in queue');
          const className = isServerBoot || isQueueState ? 'text-blue-400 font-medium' : '';
          
          // Split each log entry into lines and add breaks
          const lines = log.split('\n');
          return (
            <div key={i} className={className}>
              {lines.map((line, j) => (
                <div key={`${i}-${j}`} className="mb-3">
                  {line}
                </div>
              ))}
              {i < processedLogs.length - 1 && <div className="mb-6" />}
            </div>
          );
        }) : 'Waiting for logs...'}
      </pre>
    </div>
  );
};

export function ShapeComponent({ shape }: ShapeProps) {
  const { isDark } = useDarkMode();
  const stickyNoteColor = useStickyNoteColor(shape);
  const styles = {
    base: useThemeClass(["shape", "base"]),
    selected: useThemeClass(["shape", "selected"]),
    container: useThemeClass(["shape", "container"])
  };
  
  const {
    tool,
    shapes,
    selectedShapes,
    setSelectedShapes,
    updateShape,
    zoom,
    generatingPredictions,
    isEditingText,
    setIsEditingText
  } = useStore((state) => ({
    tool: state.tool as "select" | "pan" | "pen" | "brush" | "eraser" | "inpaint",
    shapes: state.shapes,
    selectedShapes: state.selectedShapes,
    setSelectedShapes: state.setSelectedShapes,
    updateShape: state.updateShape,
    zoom: state.zoom,
    generatingPredictions: state.generatingPredictions,
    isEditingText: state.isEditingText,
    setIsEditingText: state.setIsEditingText
  }));

  const isEditing = shape.isEditing && isEditingText;
  const textRef = useRef<HTMLTextAreaElement>(null);

  const { initDragStart, hoveredGroup, isAddedToGroup } = useShapeDrag({
    shape,
    isEditing: isEditingText,
    zoom,
  });

  const { handleResizeStart } = useShapeResize(
    shape,
    zoom,
    updateShape,
    (updates) => {
      const ids = updates.map(update => update.id);
      setSelectedShapes(ids);
    }
  );

  const {
    handleMouseDown,
    handleContextMenu,
    handleDoubleClick,
    handleKeyDown,
  } = useShapeEvents({
    shape,
    isEditing: isEditing ?? false,
    isSelected: selectedShapes.includes(shape.id),
    zoom,
    textRef,
    initDragStart,
  });

  const isSelected = selectedShapes.includes(shape.id);
  const shapeStyles = getShapeStyles(shape, isSelected, shapes, tool, Boolean(isEditing), isDark);

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
        <LoadingPlaceholder isGenerating={isGenerating} logs={shape.logs} />
        {isSelected && tool === "select" && (
          <ShapeControls
            shape={shape}
            isSelected={Boolean(isSelected)}
            handleResizeStart={handleResizeStart}
            hoveredGroup={hoveredGroup}
            isAddedToGroup={isAddedToGroup}
          />
        )}
      </div>
    );
  }

  if (shape.type === "depth") {
    const sourceShape = shapes.find(s => s.id === shape.sourceImageId);
    const aspectRatio = sourceShape ? sourceShape.width / sourceShape.height : 1;
    const showDepth = Boolean(shape.showDepth);
    
    return (
      <div
        style={{
          ...shapeStyles,
          height: shape.width / aspectRatio,
          overflow: "visible",
          backgroundColor: shape.isUploading ? "#f3f4f6" : "transparent"
        }}
        className="rounded-lg"
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
      >
        <ProcessedShape shape={shape} type="depth" />
        {(isSelected || showDepth) && tool === "select" && (
          <ShapeControls
            shape={shape}
            isSelected={isSelected}
            handleResizeStart={handleResizeStart}
            hoveredGroup={hoveredGroup}
            isAddedToGroup={isAddedToGroup}
          />
        )}
      </div>
    );
  }

  if (shape.type === "edges") {
    const sourceShape = shapes.find(s => s.id === shape.sourceImageId);
    const aspectRatio = sourceShape ? sourceShape.width / sourceShape.height : 1;
    const showEdges = Boolean(shape.showEdges);
    
    return (
      <div
        style={{
          ...shapeStyles,
          height: shape.width / aspectRatio,
          overflow: "visible",
          backgroundColor: shape.isUploading ? "#f3f4f6" : "transparent"
        }}
        className="rounded-lg"
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
      >
        <ProcessedShape shape={shape} type="edge" />
        {(isSelected || showEdges) && tool === "select" && (
          <ShapeControls
            shape={shape}
            isSelected={isSelected}
            handleResizeStart={handleResizeStart}
            hoveredGroup={hoveredGroup}
            isAddedToGroup={isAddedToGroup}
          />
        )}
      </div>
    );
  }

  if (shape.type === "pose") {
    const sourceShape = shapes.find(s => s.id === shape.sourceImageId);
    const aspectRatio = sourceShape ? sourceShape.width / sourceShape.height : 1;
    const showPose = Boolean(shape.showPose);
    
    return (
      <div
        style={{
          ...shapeStyles,
          height: shape.width / aspectRatio,
          overflow: "visible",
          backgroundColor: shape.isUploading ? "#f3f4f6" : "transparent"
        }}
        className="rounded-lg"
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
      >
        <ProcessedShape shape={shape} type="pose" />
        {(isSelected || showPose) && tool === "select" && (
          <ShapeControls
            shape={shape}
            isSelected={isSelected}
            handleResizeStart={handleResizeStart}
            hoveredGroup={hoveredGroup}
            isAddedToGroup={isAddedToGroup}
          />
        )}
      </div>
    );
  }



  if (shape.type === "image") {
    const showControls = isSelected || 
      shape.showImagePrompt || 
      shape.makeVariations || 
      shape.showDepth || 
      shape.showEdges || 
      shape.showPose || 
      shape.showSketch;

    return (
      <div
        style={{
          ...shapeStyles,
          overflow: "visible"
        }}
        className="rounded-lg"
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
      >
        <ImageShape 
          shape={shape} 
          tool={tool}
          handleContextMenu={handleContextMenu}
          onResizeStart={() => {
            // Handle resize start if needed
          }}
          onResizeEnd={() => {
            // Handle resize end if needed
          }}
        />
        {showControls && (tool === "select" || tool === "brush" || tool === "eraser" || tool === "inpaint") && (
          <ShapeControls
            shape={shape}
            isSelected={isSelected}
            handleResizeStart={(e) => {
              handleResizeStart(e);
              // Trigger resize start on ImageShape
              const imageShape = document.querySelector(`[data-shape-id="${shape.id}"]`);
              if (imageShape) {
                const event = new CustomEvent('resizeStart');
                imageShape.dispatchEvent(event);
              }
            }}
            hoveredGroup={hoveredGroup}
            isAddedToGroup={isAddedToGroup}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", width: 0, height: 0 }}>
      <div
        id={shape.id}
        style={{
          ...shapeStyles,
          overflow: "hidden",
          pointerEvents: tool === "select" ? "all" : "none",
          ...(shape.type === "sticky" && {
            backgroundColor: stickyNoteColor,
            boxShadow: `0 0 0 1px ${stickyNoteColor}`,
          }),
          ...(shape.type === "diffusionSettings" && {
            backgroundColor: "transparent",
            border: "none",
            backgroundImage: "none",
            boxShadow: "none",
          }),
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        tabIndex={0}
        className={`${styles.base} ${isEditing ? styles.selected : ""} ${
          shape.type === "diffusionSettings" ? "bg-none" : ""
        }`}
      >
        {shape.type === "diffusionSettings" && (
          <DiffusionSettingsPanel
            shape={shape}
            updateShape={updateShape}
            onAdvancedToggle={(isExpanded) => {
              updateShape(shape.id, {
                height: isExpanded ? 550 : 200,
              });
            }}
          />
        )}
  
        {shape.type === "sticky" && (
          <StickyNoteShape
            shape={shape}
            isEditing={isEditing || false}
            textRef={textRef}
            handleKeyDown={handleKeyDown}
            handleBlur={handleBlur}
          />
        )}
  

      </div>
  
      {(tool === "select" ||
        (shape.type === "diffusionSettings" &&
          tool === "brush")) && (
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
            ...(shape.type === "diffusionSettings" && {
              backgroundImage: "none",
              backgroundColor: "transparent",
            }),
          }}
          className={`${styles.container} ${
            shape.type === "diffusionSettings" ? "bg-none" : ""
          }`}
        >
          <ShapeControls
            shape={shape}
            isSelected={Boolean(isSelected)}
            handleResizeStart={handleResizeStart}
            hoveredGroup={hoveredGroup}
            isAddedToGroup={isAddedToGroup}
          />
        </div>
      )}
    </div>
  );
}