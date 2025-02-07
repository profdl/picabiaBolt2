import { useEffect, useRef, useState } from "react";
import { useStore } from "../../store";
import { ShapeComponent } from "../shapes/Shape";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useCanvasMouseHandlers } from "../../hooks/useCanvasMouseHandlers";
import { useCanvasDragAndDrop } from "../../hooks/useCanvasDragAndDrop";
import { useCanvasZoom } from "../../hooks/useCanvasZoom";
import { ZoomControl } from './ZoomControl';
import { useThemeClass } from '../../styles/useThemeClass';


export function Canvas() {


   // Theme styles
   const styles = {
    container: useThemeClass(['canvas', 'container']),
    grid: {
      major: useThemeClass(['canvas', 'grid', 'major']),
      minor: useThemeClass(['canvas', 'grid', 'minor'])
    },
    dropZone: 'absolute inset-0 bg-blue-500/10 border-2 border-blue-500 border-dashed z-50 pointer-events-none flex items-center justify-center',
    dropMessage: 'bg-neutral-50 dark:bg-neutral-800 px-4 py-2 rounded-lg shadow-lg text-neutral-700 dark:text-neutral-200 font-medium',
    selectionBox: 'border border-dotted border-neutral-500 bg-neutral-500/10 pointer-events-none z-[1000]'
  };

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

  const { shapes, isDragging, tool, gridEnabled, gridSize, setOffset } =
    useStore();

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

// trackpad controls
useEffect(() => {
  const preventDefault = (e: Event) => e.preventDefault();
  document.addEventListener('gesturestart', preventDefault);
  document.addEventListener('gesturechange', preventDefault);

  return () => {
    document.removeEventListener('gesturestart', preventDefault);
    document.removeEventListener('gesturechange', preventDefault);
  };
}, []);

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
          className={isMajorLine ? styles.grid.major : styles.grid.minor}
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
          className={isMajorLine ? styles.grid.major : styles.grid.minor}
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
        <g>{verticalLines}{horizontalLines}</g>
      </svg>
    );
  };

  // Zoom in and out
  const { zoom, offset } = useCanvasZoom(canvasRef);

  // Handle drag and drop events for adding images to the canvas
  const { isDraggingFile, handleDrop, handleDragOver, handleDragLeave } =
    useCanvasDragAndDrop();

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

    // Prevent browser back/forward gestures
    useEffect(() => {
      const preventDefaultBrowserGestures = (e: TouchEvent) => {
        // Check if more than one finger is used (to still allow single-finger scrolling)
        if (e.touches.length > 1) {
          e.preventDefault();
        }
      };
  
      // Prevent horizontal swipe navigation
      const preventHorizontalSwipe = (e: TouchEvent) => {
        // Only prevent if it's a horizontal swipe
        if (Math.abs(e.touches[0].clientX - e.touches[0].screenX) > 10) {
          e.preventDefault();
        }
      };
  
      const options = { passive: false };
  
      document.addEventListener('touchstart', preventDefaultBrowserGestures, options);
      document.addEventListener('touchmove', preventDefaultBrowserGestures, options);
      document.addEventListener('touchend', preventDefaultBrowserGestures, options);
      document.addEventListener('touchmove', preventHorizontalSwipe, options);
  
      return () => {
        document.removeEventListener('touchstart', preventDefaultBrowserGestures);
        document.removeEventListener('touchmove', preventDefaultBrowserGestures);
        document.removeEventListener('touchend', preventDefaultBrowserGestures);
        document.removeEventListener('touchmove', preventHorizontalSwipe);
      };
    }, []);
  



    return (
      <div
        ref={canvasRef}
        id="canvas-container" 
        className={`${styles.container} ${
          shapes.some((s) => s.type === "3d" && s.isOrbiting)
            ? "cursor-move"
            : tool === "pan" || spacePressed
            ? "cursor-grab"
            : tool === "pen"
            ? "cursor-crosshair"
            : "cursor-default"
        } ${isDragging ? "cursor-grabbing" : ""}`}
        style={{ touchAction: 'none' }} 
        onMouseDown={(e) => handleMouseDown(e, canvasRef, spacePressed)}
        onMouseMove={(e) => handleMouseMove(e, canvasRef)}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnter={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        {isDraggingFile && (
          <div className={styles.dropZone}>
            <div className={styles.dropMessage}>
              <p>Drop images here</p>
            </div>
          </div>
        )}
        {renderGrid()}
        <div
          className="relative w-full h-full"
          style={{
            transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
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
            className={styles.selectionBox}
            style={{
              position: "absolute",
              left: Math.min(selectionBox.startX, selectionBox.startX + selectionBox.width) * zoom + offset.x,
              top: Math.min(selectionBox.startY, selectionBox.startY + selectionBox.height) * zoom + offset.y,
              width: Math.abs(selectionBox.width) * zoom,
              height: Math.abs(selectionBox.height) * zoom,
            }}
          />
        )}
        <ZoomControl />
      </div>
    );
  }