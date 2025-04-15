import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowDown,
  ArrowUp,
  MoveDown,
  MoveUp,
  Group,
  Ungroup,
  Layers,
  Crop,
  Download,
  Box,
  MousePointer,
  Brush,
  Eraser,
  Combine,
  Paintbrush,
  RefreshCw,
  Pipette,
  SlidersHorizontal,
} from "lucide-react";
import { Shape } from "../../../types";
import { useStore } from "../../../store";
import { Tooltip } from "../../shared/Tooltip";
import { ToolbarButton } from "../../shared/ToolbarButton";
import { OKColorPicker } from "../../shared/hsl-color-picker";
import { BrushSettingsPanel } from "./BrushShapeSelector";
import { SmallSlider } from "../../shared/SmallSlider";
import { useThemeClass } from "../../../styles/useThemeClass";
import { MiniToggle } from "../../shared/MiniToggle";
import { resetMask } from "../../../utils/imageShapeCanvas";

interface PropertiesToolbarProps {
  type: "brush" | "eraser" | "inpaint" | "image" | "shape";
  properties?: {
    color?: string;
    texture?: string;
    size?: number;
    opacity?: number;
    rotation?: number;
    followPath?: boolean;
    spacing?: number;
    hardness?: number;
    contrast?: number;
  };
  onPropertyChange?: (property: string, value: unknown) => void;
  shape?: Shape;
  selectedShapes?: string[];
  shapes?: Shape[];
  actions?: {
    sendBackward: () => void;
    sendForward: () => void;
    sendToBack: () => void;
    sendToFront: () => void;
    duplicate: () => void;
    deleteShape: (id: string) => void;
    createGroup: (ids: string[]) => void;
    ungroup: (id: string) => void;
    addToGroup: (shapeIds: string[], groupId: string) => void;
    removeFromGroup: (shapeIds: string[]) => void;
    mergeImages: (ids: string[]) => Promise<void>;
    onSelectSubject: (e: React.MouseEvent) => void;
    onCrop: (e: React.MouseEvent) => void;
    onDownload: (e: React.MouseEvent) => void;
    create3DDepth: (shape: Shape, position: { x: number; y: number }) => void;
    onFlatten: (e: React.MouseEvent) => void;
    addShape: (shape: Shape) => void;
    generatePreprocessedImage: (id: string, type: string) => Promise<void>;
    updateImageSettings: (id: string, settings: Partial<Shape>) => void;
  };
}

export const PropertiesToolbar: React.FC<PropertiesToolbarProps> = ({
  properties,
  onPropertyChange,
  shape,
  selectedShapes = [],
  shapes = [],
  actions,
}) => {
  const { 
    tool, 
    addShape: storeAddShape, 
    generatePreprocessedImage: storeGeneratePreprocessedImage, 
    setTool, 
    inpaintRestoreMode, 
    setInpaintRestoreMode,
    isColorPickerOpen,
    setColorPickerOpen,
    zoom,
    offset,
    setOffset,
    updateShape,
    isEyedropperActive,
    setEyedropperActive,
  } = useStore((state) => ({
    tool: state.tool,
    addShape: state.addShape,
    generatePreprocessedImage: state.generatePreprocessedImage,
    setTool: state.setTool,
    inpaintRestoreMode: state.inpaintRestoreMode,
    setInpaintRestoreMode: state.setInpaintRestoreMode,
    isColorPickerOpen: state.isColorPickerOpen,
    setColorPickerOpen: state.setColorPickerOpen,
    zoom: state.zoom,
    offset: state.offset,
    setOffset: state.setOffset,
    updateShape: state.updateShape,
    isEyedropperActive: state.isEyedropperActive,
    setEyedropperActive: state.setEyedropperActive,
  }));

  const [showArrangeSubMenu, setShowArrangeSubMenu] = useState(false);
  const [showAdjustmentsMenu, setShowAdjustmentsMenu] = useState(false);
  const [localProperties, setLocalProperties] = useState(properties || {});

  const styles = {
    buttonGroup: "flex items-center gap-1",
    button: useThemeClass(["toolbar", "button", "base"]),
    divider: "w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1.5",
    arrangeMenu: {
      container: "absolute bottom-full mb-1 left-0 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-1 min-w-[160px]",
      item: "flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors",
    },
    adjustmentsMenu: {
      container: "absolute bottom-full mb-1 left-0 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-2 min-w-[200px]",
      item: "flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors",
    },
    colorPicker: {
      trigger: "w-6 h-6 rounded-full cursor-pointer",
      popup: "absolute bottom-full mb-1 left-0 z-50",
    },
    controlGroup: {
      container: "flex items-center gap-1.5 min-w-[120px]",
      label: "text-[10px] font-medium tracking-wide uppercase text-neutral-600 dark:text-neutral-400",
    },
  };

  // Create a dummy shape for pan tool when no shape is selected
  const displayShape = tool === "pan" && !shape ? {
    id: "pan-tool",
    type: "group" as const,
    position: { x: 0, y: 0 },
    width: 0,
    height: 0,
    rotation: 0,
    color: "transparent",
    groupEnabled: true,
  } : shape;

  // Create dummy actions for pan tool when no actions are provided
  const displayActions = {
    ...(actions || {
      sendBackward: () => {},
      sendForward: () => {},
      sendToBack: () => {},
      sendToFront: () => {},
      duplicate: () => {},
      deleteShape: () => {},
      createGroup: () => {},
      ungroup: () => {},
      addToGroup: () => {},
      removeFromGroup: () => {},
      mergeImages: async () => {},
      onSelectSubject: () => {},
      onCrop: () => {},
      onDownload: () => {},
      create3DDepth: () => {},
      onFlatten: () => {},
    }),
    addShape: (actions?.addShape || storeAddShape) as (shape: Shape) => void,
    generatePreprocessedImage: (actions?.generatePreprocessedImage || storeGeneratePreprocessedImage) as (id: string, type: string) => Promise<void>,
    updateImageSettings: (actions?.updateImageSettings || updateShape) as (id: string, settings: Partial<Shape>) => void,
  };

  const selectedShapeObjects = shapes.filter((s) =>
    selectedShapes.includes(s.id)
  );
  const areAllImages =
    selectedShapeObjects.length > 1 &&
    selectedShapeObjects.every((s) => s.type === "image");

  // Check if any selected shapes are in a group
  const selectedShapesInGroup = selectedShapeObjects.some(s => s.groupId);

  // Check if a group is selected
  const isGroupSelected = selectedShapeObjects.some(s => s.type === "group");

  // Check if we have both a group and non-group shapes selected
  const hasGroupAndShapes = isGroupSelected && selectedShapeObjects.some(s => s.type !== "group");

  // Get the selected group if one exists
  const selectedGroup = selectedShapeObjects.find(s => s.type === "group");

  // Get shapes that can be added to the group (non-group shapes)
  const shapesToAdd = selectedShapeObjects
    .filter(s => s.type !== "group")
    .map(s => s.id);

  // Add function to center on shape
  const centerOnShape = (newShape: Shape) => {
    // Calculate the target offset to center the shape
    const targetOffset = {
      x: -(newShape.position.x + newShape.width/2) * zoom + window.innerWidth / 2,
      y: -(newShape.position.y + newShape.height/2) * zoom + window.innerHeight / 2 - (newShape.height * zoom * 0.2), // Subtract 20% of shape height for upward bias
    };

    // Animate the offset change
    const startOffset = { ...offset };
    const duration = 500; // Animation duration in ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out-cubic)
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      setOffset({
        x: startOffset.x + (targetOffset.x - startOffset.x) * easeProgress,
        y: startOffset.y + (targetOffset.y - startOffset.y) * easeProgress,
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  };

  // Fix handleColorChange to use functional updates
  const handleColorChange = useCallback((color: string) => {
    setLocalProperties(prevProps => ({ ...prevProps, color }));
    onPropertyChange?.("color", color);
  }, [onPropertyChange]);

  const handlePropertyChange = (property: string, value: unknown) => {
    setLocalProperties({ ...localProperties, [property]: value });
    onPropertyChange?.(property, value);
  };

  // Define handleEyedropperClick with useCallback
  const handleEyedropperClick = useCallback(() => {
    setEyedropperActive(true);
    
    // Create an overlay to intercept all mouse events
    const overlay = document.createElement('div');
    overlay.id = 'eyedropper-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.zIndex = '9999';
    overlay.style.cursor = 'crosshair';
    overlay.style.backgroundColor = 'transparent';
    document.body.appendChild(overlay);
    
    // Create the preview element once
    const preview = document.createElement('div');
    preview.id = 'eyedropper-preview';
    preview.style.position = 'absolute';
    preview.style.width = '30px';
    preview.style.height = '30px';
    preview.style.borderRadius = '50%';
    preview.style.border = '2px solid white';
    preview.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.3)';
    preview.style.pointerEvents = 'none';
    preview.style.zIndex = '10000';
    document.body.appendChild(preview);
    
    // Get all visible image and canvas elements
    const getVisibleCanvases = () => {
      // Get all image canvases (content or visible canvas)
      const imageCanvases = Array.from(document.querySelectorAll('canvas[data-canvas-type="content"], canvas[data-canvas-type="visible"]'));
      
      // Get all other canvases that might be relevant
      const otherCanvases = Array.from(document.querySelectorAll('canvas:not([data-canvas-type="mask"])')).filter(
        canvas => !imageCanvases.includes(canvas as HTMLCanvasElement)
      );
      
      // Combine and filter for visibility
      return [...imageCanvases, ...otherCanvases]
        .filter(canvas => {
          const rect = canvas.getBoundingClientRect();
          return (
            rect.width > 0 && 
            rect.height > 0 && 
            rect.left < window.innerWidth && 
            rect.top < window.innerHeight && 
            rect.right > 0 && 
            rect.bottom > 0
          );
        }) as HTMLCanvasElement[];
    };
    
    // Function to get the current zoom and offset for coordinate conversion
    const getCurrentTransform = () => {
      return {
        zoom: zoom,
        offset: offset
      };
    };
    
    // Find ImageShape by checking all elements at a point
    const findImageShapeAtPoint = (x: number, y: number): HTMLCanvasElement | null => {
      // Get elements at point
      let element = document.elementFromPoint(x, y);
      
      // Walk up the DOM tree to find the closest canvas element with shape data
      while (element && element !== document.body) {
        if (element.tagName === 'CANVAS') {
          const canvas = element as HTMLCanvasElement;
          const shapeId = canvas.getAttribute('data-shape-id');
          const canvasType = canvas.getAttribute('data-canvas-type');
          
          if (shapeId && (canvasType === 'content' || canvasType === 'visible')) {
            return canvas;
          }
        }
        element = element.parentElement;
      }
      
      return null;
    };
    
    // Function to sample color at a point, accounting for zoom and pan
    const sampleColorAtPoint = (x: number, y: number): string => {
      // First try to find an ImageShape specifically
      const imageCanvas = findImageShapeAtPoint(x, y);
      if (imageCanvas) {
        try {
          const ctx = imageCanvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) throw new Error('Could not get canvas context');
          
          const rect = imageCanvas.getBoundingClientRect();
          
          // Convert screen coordinates to canvas coordinates
          const canvasX = Math.floor((x - rect.left) * (imageCanvas.width / rect.width));
          const canvasY = Math.floor((y - rect.top) * (imageCanvas.height / rect.height));
          
          // Sample pixel data
          const pixelData = ctx.getImageData(canvasX, canvasY, 1, 1).data;
          
          // Convert to hex
          return `#${pixelData[0].toString(16).padStart(2, '0')}${pixelData[1].toString(16).padStart(2, '0')}${pixelData[2].toString(16).padStart(2, '0')}`;
        } catch (error) {
          console.error('Error sampling ImageShape:', error);
        }
      }
      
      // Fall back to checking all visible canvases
      const visibleCanvases = getVisibleCanvases();
      const transform = getCurrentTransform();
      
      for (const canvas of visibleCanvases) {
        const rect = canvas.getBoundingClientRect();
        
        // Check if point is within canvas bounds
        if (
          x >= rect.left && 
          x <= rect.right && 
          y >= rect.top && 
          y <= rect.bottom
        ) {
          try {
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) continue;
            
            // Check if this is a main canvas that needs transform adjustment
            const isMainCanvas = canvas.classList.contains('whiteboard-canvas');
            let canvasX, canvasY;
            
            if (isMainCanvas) {
              // Convert screen coordinates to canvas coordinates with zoom/pan adjustment
              canvasX = Math.floor((x - rect.left) / transform.zoom - transform.offset.x / transform.zoom);
              canvasY = Math.floor((y - rect.top) / transform.zoom - transform.offset.y / transform.zoom);
            } else {
              // Normal conversion for other canvases
              canvasX = Math.floor((x - rect.left) * (canvas.width / rect.width));
              canvasY = Math.floor((y - rect.top) * (canvas.height / rect.height));
            }
            
            // Check bounds
            if (canvasX < 0 || canvasY < 0 || canvasX >= canvas.width || canvasY >= canvas.height) continue;
            
            // Sample pixel data
            const pixelData = ctx.getImageData(canvasX, canvasY, 1, 1).data;
            
            // Only use color if it's not fully transparent
            if (pixelData[3] > 0) {
              return `#${pixelData[0].toString(16).padStart(2, '0')}${pixelData[1].toString(16).padStart(2, '0')}${pixelData[2].toString(16).padStart(2, '0')}`;
            }
          } catch (error) {
            console.error('Error sampling canvas color:', error);
          }
        }
      }
      
      // If no canvas found or no color sampled, try to get color from DOM element
      const element = document.elementFromPoint(x, y);
      if (element) {
        const computedStyle = window.getComputedStyle(element);
        const bgColor = computedStyle.backgroundColor;
        
        if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
          // Convert rgb/rgba to hex
          if (bgColor.startsWith('rgb')) {
            const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
            if (match) {
              const r = parseInt(match[1]);
              const g = parseInt(match[2]);
              const b = parseInt(match[3]);
              return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            }
          }
          return bgColor;
        }
        
        // Check if there's a background image
        const bgImage = computedStyle.backgroundImage;
        if (bgImage && bgImage !== 'none') {
          // For background images, we can't sample the actual color
          // Return a placeholder or the most prominent color
          return '#7f7f7f'; // Mid-gray as fallback
        }
      }
      
      // Default color if nothing found
      return '#000000';
    };
    
    // Set up event listeners
    const handleMouseMove = (e: MouseEvent) => {
      const color = sampleColorAtPoint(e.clientX, e.clientY);
      
      // Update preview
      preview.style.backgroundColor = color;
      preview.style.left = `${e.clientX + 15}px`;
      preview.style.top = `${e.clientY + 15}px`;
    };
    
    const cleanup = () => {
      // Remove event listeners
      overlay.removeEventListener('mousemove', handleMouseMove);
      overlay.removeEventListener('click', handleMouseClick);
      
      // Remove overlay and preview
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      
      if (document.body.contains(preview)) {
        document.body.removeChild(preview);
      }
      
      // Reset cursor
      document.body.style.cursor = 'default';
      
      // Reset eyedropper state
      setEyedropperActive(false);
    };
    
    const handleMouseClick = (e: MouseEvent) => {
      const color = sampleColorAtPoint(e.clientX, e.clientY);
      
      // Update the color in the color picker
      handleColorChange(color);
      
      // Clean up
      cleanup();
    };
    
    // Add event listeners to the overlay
    overlay.addEventListener('mousemove', handleMouseMove);
    overlay.addEventListener('click', handleMouseClick);
    
    // Add ESC key listener to cancel
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup function
    return () => {
      cleanup();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setEyedropperActive, handleColorChange, zoom, offset]);

  // Now add the keyboard shortcut useEffect after defining the function
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only activate when brush tool is active and the I key is pressed
      // Also check that no input elements are focused
      if (
        tool === "brush" && 
        e.key === "i" && 
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        handleEyedropperClick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [tool, handleEyedropperClick]);

  const calculateNewShapePosition = () => {
    if (!displayShape) {
      return { x: 0, y: 0 };
    }
    
    const baseX = displayShape.position.x + displayShape.width + 20;
    const baseY = displayShape.position.y;
    
    // Find all reference shapes (depth, edges, pose) that are to the right of the source shape
    const existingShapes = shapes.filter(shape => 
      (shape.type === "depth" || shape.type === "edges" || shape.type === "pose") && 
      shape.position.x >= baseX - 20 && // Include shapes within 20px to the left
      shape.position.x <= baseX + 20 && // Include shapes within 20px to the right
      Math.abs(shape.position.y - baseY) < displayShape.height + 20
    );
    
    // If there are existing shapes, place the new shape to the right of the rightmost shape
    if (existingShapes.length > 0) {
      // Find the shape with the highest x position (rightmost)
      const rightmostShape = existingShapes.reduce((prev, current) => 
        (prev.position.x + prev.width > current.position.x + current.width) ? prev : current
      );
      
      return {
        x: rightmostShape.position.x + rightmostShape.width + 20, // Place 20px to the right of the rightmost shape
        y: baseY
      };
    }
    
    return {
      x: baseX,
      y: baseY
    };
  };

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-[280px] flex flex-col gap-2 mb-2.5">
      <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-300 dark:border-neutral-800 py-1 px-1 h-[44px] inline-block">
        <div className="flex items-center h-full">
          {/* Tools Section - Fixed width */}
          <div className="flex items-center gap-2">
            <Tooltip content="Select Tool (V)" side="top">
              <ToolbarButton
                icon={<MousePointer className="w-4 h-4" />}
                active={tool === "select"}
                onClick={() => setTool("select")}
                className={styles.button}
              />
            </Tooltip>

            {/* Always show brush and eraser buttons, but disable them if not applicable */}
            <Tooltip content="Brush Tool (B)" side="top">
              <ToolbarButton
                icon={<Brush className="w-4 h-4" />}
                active={tool === "brush"}
                onClick={() => setTool("brush")}
                disabled={shape && shape.type !== "image" && shape.type !== "sketchpad"}
                className={`${styles.button} ${shape && shape.type !== "image" && shape.type !== "sketchpad" ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </Tooltip>

            <Tooltip content="Brush Eraser (E)" side="top">
              <ToolbarButton
                icon={<Eraser className="w-4 h-4" />}
                active={tool === "eraser"}
                onClick={() => {
                  setTool("eraser");
                  useStore.getState().setMaskMode(false);
                }}
                disabled={shape && shape.type !== "image" && shape.type !== "sketchpad"}
                className={`${styles.button} ${shape && shape.type !== "image" && shape.type !== "sketchpad" ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </Tooltip>

            <Tooltip content="In-Paint Brush (I)" side="top">
              <ToolbarButton
                icon={<Paintbrush className="w-4 h-4" />}
                active={tool === "inpaint"}
                onClick={() => {
                  setTool("inpaint");
                  useStore.getState().setMaskMode(true);
                }}
                disabled={shape && shape.type !== "image" && shape.type !== "sketchpad"}
                className={`${styles.button} ${shape && shape.type !== "image" && shape.type !== "sketchpad" ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </Tooltip>
            <div className="w-[1px] h-6 bg-black dark:bg-black mx-2" />
          </div>

          {/* Content Section - Grows with content */}
          <div className="flex items-center gap-2 whitespace-nowrap pr-3">
            {/* Select Tool Sub-toolbar */}
            {tool === "select" && displayShape && (
              <div className="flex items-center gap-0.5">
                <div className="flex items-center gap-0.5">
                  {selectedShapes.length === 1 && displayShape.type === "image" && (
                    <>
                      <div className="flex items-center gap-0.5 px-1">
                        <Tooltip content="Get Depth Reference from Image" side="top">
                          <button
                            className="text-[10px] font-medium tracking-wide uppercase text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                            onClick={async () => {
                              // Generate a unique prediction ID using crypto like in handleGenerate
                              const prediction_id = crypto.randomUUID();
                              
                              const newDepthShape: Shape = {
                                id: prediction_id,
                                type: "depth",
                                position: calculateNewShapePosition(),
                                width: displayShape.width,
                                height: displayShape.height,
                                rotation: 0,
                                isEditing: false,
                                color: "#1a1a1a", // Dark background color to match Generate placeholder
                                sourceImageId: displayShape.id,
                                showDepth: true,
                                model: "",
                                useSettings: false,
                                isUploading: true,
                                contentStrength: 0.5,
                                sketchStrength: 0.5,
                                depthStrength: 0.5,
                                edgesStrength: 0.5,
                                poseStrength: 0.5,
                                logs: ["Initializing depth map generation...", "Preparing image for depth detection..."],
                                depthPreviewUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231a1a1a'/%3E%3Cpath d='M50 30 L50 70 M30 50 L70 50' stroke='%235f6368' stroke-width='2'/%3E%3C/svg%3E",
                              };
                              
                              // Disable all other depth references before adding the new one
                              shapes.forEach((otherShape) => {
                                if (otherShape.type === "depth") {
                                  updateShape(otherShape.id, { showDepth: false });
                                }
                              });
                              
                              // Add the shape
                              displayActions.addShape(newDepthShape);
                              
                              // Add to generating predictions
                              useStore.getState().addGeneratingPrediction(prediction_id);
                              
                              // Center on shape with animation like in handleGenerate
                              centerOnShape(newDepthShape);
                              
                              try {
                                // Update logs with progress information
                                setTimeout(() => {
                                  updateShape(prediction_id, { 
                                    logs: ["Initializing depth map generation...", 
                                           "Preparing image for depth detection...",
                                           "Loading MiDaS depth estimation model..."]
                                  });
                                }, 500);
                                
                                setTimeout(() => {
                                  updateShape(prediction_id, { 
                                    logs: ["Initializing depth map generation...", 
                                           "Preparing image for depth detection...",
                                           "Loading MiDaS depth estimation model...",
                                           "Analyzing image geometry and structure..."]
                                  });
                                }, 2000);
                                
                                // Generate the depth map
                                await displayActions.generatePreprocessedImage(displayShape.id, "depth");
                                
                                // Final update to show completion
                                updateShape(prediction_id, { 
                                  logs: ["Initializing depth map generation...", 
                                         "Preparing image for depth detection...",
                                         "Loading MiDaS depth estimation model...",
                                         "Analyzing image geometry and structure...",
                                         "Depth map generation complete!"]
                                });
                                
                                // Bring to front
                                displayActions.sendToFront();
                              } finally {
                                // Remove from generating predictions when complete
                                useStore.getState().removeGeneratingPrediction(prediction_id);
                              }
                            }}
                          >
                            Depth
                          </button>
                        </Tooltip>

                        <Tooltip content="Get Edges Reference from Image" side="top">
                          <button
                            className="text-[10px] font-medium tracking-wide uppercase text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                            onClick={async () => {
                              // Generate a unique prediction ID using crypto like in handleGenerate
                              const prediction_id = crypto.randomUUID();
                              
                              const newEdgesShape: Shape = {
                                id: prediction_id,
                                type: "edges",
                                position: calculateNewShapePosition(),
                                width: displayShape.width,
                                height: displayShape.height,
                                rotation: 0,
                                isEditing: false,
                                color: "#1a1a1a", // Dark background color to match Generate placeholder
                                sourceImageId: displayShape.id,
                                showEdges: true,
                                model: "",
                                useSettings: false,
                                isUploading: true,
                                contentStrength: 0.5,
                                sketchStrength: 0.5,
                                depthStrength: 0.5,
                                edgesStrength: 0.5,
                                poseStrength: 0.5,
                                logs: ["Initializing edge detection...", "Preparing image for edge extraction..."],
                                edgePreviewUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231a1a1a'/%3E%3Cpath d='M50 30 L50 70 M30 50 L70 50' stroke='%235f6368' stroke-width='2'/%3E%3C/svg%3E",
                              };
                              
                              // Disable all other edge references before adding the new one
                              shapes.forEach((otherShape) => {
                                if (otherShape.type === "edges") {
                                  updateShape(otherShape.id, { showEdges: false });
                                }
                              });
                              
                              // Add the shape
                              displayActions.addShape(newEdgesShape);
                              
                              // Add to generating predictions
                              useStore.getState().addGeneratingPrediction(prediction_id);
                              
                              // Center on shape with animation like in handleGenerate
                              centerOnShape(newEdgesShape);
                              
                              try {
                                // Update logs with progress information
                                setTimeout(() => {
                                  updateShape(prediction_id, { 
                                    logs: ["Initializing edge detection...", 
                                           "Preparing image for edge extraction...",
                                           "Loading Canny edge detection model..."]
                                  });
                                }, 500);
                                
                                setTimeout(() => {
                                  updateShape(prediction_id, { 
                                    logs: ["Initializing edge detection...", 
                                           "Preparing image for edge extraction...",
                                           "Loading Canny edge detection model...",
                                           "Detecting contours and edges..."]
                                  });
                                }, 2000);
                                
                                // Generate the edges
                                await displayActions.generatePreprocessedImage(displayShape.id, "edge");
                                
                                // Final update to show completion
                                updateShape(prediction_id, { 
                                  logs: ["Initializing edge detection...", 
                                         "Preparing image for edge extraction...",
                                         "Loading Canny edge detection model...",
                                         "Detecting contours and edges...",
                                         "Edge detection complete!"]
                                });
                                
                                // Bring to front
                                displayActions.sendToFront();
                              } finally {
                                // Remove from generating predictions when complete
                                useStore.getState().removeGeneratingPrediction(prediction_id);
                              }
                            }}
                          >
                            Edges
                          </button>
                        </Tooltip>

                        <Tooltip content="Get Pose Reference from Image" side="top">
                          <button
                            className="text-[10px] font-medium tracking-wide uppercase text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                            onClick={async () => {
                              // Generate a unique prediction ID using crypto like in handleGenerate
                              const prediction_id = crypto.randomUUID();
                              
                              const newPoseShape: Shape = {
                                id: prediction_id,
                                type: "pose",
                                position: calculateNewShapePosition(),
                                width: displayShape.width,
                                height: displayShape.height,
                                rotation: 0,
                                isEditing: false,
                                color: "#1a1a1a", // Dark background color to match Generate placeholder
                                sourceImageId: displayShape.id,
                                showPose: true,
                                model: "",
                                useSettings: false,
                                isUploading: true,
                                contentStrength: 0.5,
                                sketchStrength: 0.5,
                                depthStrength: 0.5,
                                edgesStrength: 0.5,
                                poseStrength: 0.5,
                                logs: ["Initializing pose detection...", "Preparing image for pose analysis..."],
                                posePreviewUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231a1a1a'/%3E%3Cpath d='M50 30 L50 70 M30 50 L70 50' stroke='%235f6368' stroke-width='2'/%3E%3C/svg%3E",
                              };
                              
                              // Disable all other pose references before adding the new one
                              shapes.forEach((otherShape) => {
                                if (otherShape.type === "pose") {
                                  updateShape(otherShape.id, { showPose: false });
                                }
                              });
                              
                              // Add the shape
                              displayActions.addShape(newPoseShape);
                              
                              // Add to generating predictions
                              useStore.getState().addGeneratingPrediction(prediction_id);
                              
                              // Center on shape with animation like in handleGenerate
                              centerOnShape(newPoseShape);
                              
                              try {
                                // Update logs with progress information
                                setTimeout(() => {
                                  updateShape(prediction_id, { 
                                    logs: ["Initializing pose detection...", 
                                           "Preparing image for pose analysis...",
                                           "Loading OpenPose detection model..."] 
                                  });
                                }, 500);
                                
                                setTimeout(() => {
                                  updateShape(prediction_id, { 
                                    logs: ["Initializing pose detection...", 
                                           "Preparing image for pose analysis...",
                                           "Loading OpenPose detection model...",
                                           "Detecting human figures and body keypoints..."]
                                  });
                                }, 2000);
                                
                                // Generate the pose
                                await displayActions.generatePreprocessedImage(displayShape.id, "pose");
                                
                                // Final update to show completion
                                updateShape(prediction_id, { 
                                  logs: ["Initializing pose detection...", 
                                         "Preparing image for pose analysis...",
                                         "Loading OpenPose detection model...",
                                         "Detecting human figures and body keypoints...",
                                         "Pose detection complete!"]
                                });
                                
                                // Bring to front
                                displayActions.sendToFront();
                              } finally {
                                // Remove from generating predictions when complete
                                useStore.getState().removeGeneratingPrediction(prediction_id);
                              }
                            }}
                          >
                            Pose
                          </button>
                        </Tooltip>
                      </div>

                      <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-0.5 mr-1.5" />
                      <Tooltip content="Remove Background" side="top">
                        <button
                          className="text-[10px] font-medium tracking-wide uppercase text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                          onClick={displayActions.onSelectSubject}
                        >
                          Remove BG
                        </button>
                      </Tooltip>
                      <Tooltip content="Crop Image" side="top">
                        <ToolbarButton
                          icon={<Crop className="w-4 h-4" />}
                          onClick={displayActions.onCrop}
                          className={styles.button}
                        />
                      </Tooltip>
                    </>
                  )}

                  {selectedShapes.length === 1 && (
                    <>
                      <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-0.5" />
                      <div className="relative">
                        <Tooltip content="Arrange" side="top">
                          <ToolbarButton
                            icon={<Layers className="w-4 h-4" />}
                            onClick={() => setShowArrangeSubMenu(!showArrangeSubMenu)}
                            active={showArrangeSubMenu}
                            className={styles.button}
                          />
                        </Tooltip>
                        
                        {showArrangeSubMenu && (
                          <>
                            <div
                              className="fixed inset-0"
                              onClick={() => setShowArrangeSubMenu(false)}
                            />
                            <div className={styles.arrangeMenu.container}>
                              <button
                                className={styles.arrangeMenu.item}
                                onClick={() => {
                                  displayActions.sendBackward();
                                  setShowArrangeSubMenu(false);
                                }}
                              >
                                <ArrowDown className="w-4 h-4" />
                                Send Backward
                              </button>
                              <button
                                className={styles.arrangeMenu.item}
                                onClick={() => {
                                  displayActions.sendForward();
                                  setShowArrangeSubMenu(false);
                                }}
                              >
                                <ArrowUp className="w-4 h-4" />
                                Send Forward
                              </button>
                              <button
                                className={styles.arrangeMenu.item}
                                onClick={() => {
                                  displayActions.sendToBack();
                                  setShowArrangeSubMenu(false);
                                }}
                              >
                                <MoveDown className="w-4 h-4" />
                                Send to Back
                              </button>
                              <button
                                className={styles.arrangeMenu.item}
                                onClick={() => {
                                  displayActions.sendToFront();
                                  setShowArrangeSubMenu(false);
                                }}
                              >
                                <MoveUp className="w-4 h-4" />
                                Send to Front
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-0.5" />
                      <Tooltip content="Download" side="top">
                        <ToolbarButton
                          icon={<Download className="w-4 h-4" />}
                          onClick={displayActions.onDownload}
                          className={styles.button}
                        />
                      </Tooltip>
                    </>
                  )}

                  {selectedShapes.length > 1 && (
                    <>
                      <div className="relative">
                        <Tooltip content="Arrange" side="top">
                          <ToolbarButton
                            icon={<Layers className="w-4 h-4" />}
                            onClick={() => setShowArrangeSubMenu(!showArrangeSubMenu)}
                            active={showArrangeSubMenu}
                            className={styles.button}
                          />
                        </Tooltip>
                        
                        {showArrangeSubMenu && (
                          <>
                            <div
                              className="fixed inset-0"
                              onClick={() => setShowArrangeSubMenu(false)}
                            />
                            <div className={styles.arrangeMenu.container}>
                              <button
                                className={styles.arrangeMenu.item}
                                onClick={() => {
                                  displayActions.sendBackward();
                                  setShowArrangeSubMenu(false);
                                }}
                              >
                                <ArrowDown className="w-4 h-4" />
                                Send Backward
                              </button>
                              <button
                                className={styles.arrangeMenu.item}
                                onClick={() => {
                                  displayActions.sendForward();
                                  setShowArrangeSubMenu(false);
                                }}
                              >
                                <ArrowUp className="w-4 h-4" />
                                Send Forward
                              </button>
                              <button
                                className={styles.arrangeMenu.item}
                                onClick={() => {
                                  displayActions.sendToBack();
                                  setShowArrangeSubMenu(false);
                                }}
                              >
                                <MoveDown className="w-4 h-4" />
                                Send to Back
                              </button>
                              <button
                                className={styles.arrangeMenu.item}
                                onClick={() => {
                                  displayActions.sendToFront();
                                  setShowArrangeSubMenu(false);
                                }}
                              >
                                <MoveUp className="w-4 h-4" />
                                Send to Front
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {areAllImages && (
                        <Tooltip content="Merge Images" side="top">
                          <ToolbarButton
                            icon={
                              <div className="flex items-center gap-1.5">
                                <Combine className="w-4 h-4" />
                                <span className="text-sm">Merge Images</span>
                              </div>
                            }
                            onClick={() => displayActions.mergeImages(selectedShapes)}
                            className={styles.button}
                          />
                        </Tooltip>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Image Properties Section */}
            {tool === "select" && displayShape?.type === "image" && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Tooltip content="Image Adjustments" side="top">
                    <ToolbarButton
                      icon={<SlidersHorizontal className="w-4 h-4" />}
                      onClick={() => setShowAdjustmentsMenu(!showAdjustmentsMenu)}
                      active={showAdjustmentsMenu}
                      className={styles.button}
                    />
                  </Tooltip>
                  
                  {showAdjustmentsMenu && (
                    <>
                      <div
                        className="fixed inset-0"
                        onClick={() => setShowAdjustmentsMenu(false)}
                      />
                      <div className={styles.adjustmentsMenu.container}>
                        <div className="flex flex-col gap-2">
                          <div className={styles.controlGroup.container}>
                            <span className={styles.controlGroup.label}>Contrast</span>
                            <div className="w-[120px]">
                              <SmallSlider
                                value={(displayShape.contrast ?? 1.0) * 100}
                                onChange={(value) => {
                                  const contrast = value / 100;
                                  displayActions.updateImageSettings(displayShape.id, { contrast });
                                }}
                                min={0}
                                max={200}
                                step={1}
                                label="Contrast"
                              />
                            </div>
                          </div>
                          
                          <div className={styles.controlGroup.container}>
                            <span className={styles.controlGroup.label}>Saturation</span>
                            <div className="w-[120px]">
                              <SmallSlider
                                value={(displayShape.saturation ?? 1.0) * 100}
                                onChange={(value) => {
                                  const saturation = value / 100;
                                  displayActions.updateImageSettings(displayShape.id, { saturation });
                                }}
                                min={0}
                                max={200}
                                step={1}
                                label="Saturation"
                              />
                            </div>
                          </div>
                          
                          <div className={styles.controlGroup.container}>
                            <span className={styles.controlGroup.label}>Brightness</span>
                            <div className="w-[120px]">
                              <SmallSlider
                                value={(displayShape.brightness ?? 1.0) * 100}
                                onChange={(value) => {
                                  const brightness = value / 100;
                                  displayActions.updateImageSettings(displayShape.id, { brightness });
                                }}
                                min={0}
                                max={200}
                                step={1}
                                label="Brightness"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Brush Tool Sub-toolbar */}
            {tool === "brush" && localProperties && onPropertyChange && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-3 relative">
                  <div
                    className={styles.colorPicker.trigger}
                    onClick={(e) => {
                      e.stopPropagation();
                      setColorPickerOpen(!isColorPickerOpen);
                    }}
                    style={{ backgroundColor: localProperties.color }}
                  />
                  
                  {/* Add Eyedropper Button */}
                  <Tooltip content="Color Eyedropper (I)" side="top">
                    <ToolbarButton
                      icon={<Pipette className="w-4 h-4" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEyedropperClick();
                      }}
                      active={isEyedropperActive}
                      className={styles.button}
                    />
                  </Tooltip>

                  {isColorPickerOpen && (
                    <>
                      <div
                        className="fixed inset-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setColorPickerOpen(false);
                        }}
                      />
                      <div 
                        className={styles.colorPicker.popup}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <OKColorPicker
                          value={localProperties.color}
                          onChange={handleColorChange}
                          defaultColor={{
                            hue: 0,
                            saturation: 100,
                            lightness: 50,
                          }}
                        />
                      </div>
                    </>
                  )}
                  <BrushSettingsPanel
                    currentTexture={localProperties.texture || "basic"}
                    rotation={localProperties.rotation}
                    spacing={localProperties.spacing}
                    followPath={localProperties.followPath}
                    onTextureSelect={(texture: string) => handlePropertyChange("texture", texture)}
                    onPropertyChange={handlePropertyChange}
                  />
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <div className={styles.controlGroup.container}>
                    <span className={styles.controlGroup.label}>Size</span>
                    <div className="w-[120px]">
                      <SmallSlider
                        value={localProperties.size || 1}
                        onChange={(value) => handlePropertyChange("size", value)}
                        min={1}
                        max={100}
                        step={1}
                        label="Size"
                      />
                    </div>
                  </div>

                  <div className={styles.controlGroup.container}>
                    <span className={styles.controlGroup.label}>Opacity</span>
                    <div className="w-[120px]">
                      <SmallSlider
                        value={(localProperties.opacity || 0) * 100}
                        onChange={(value) => handlePropertyChange("opacity", value / 100)}
                        min={0}
                        max={100}
                        step={1}
                        label="Opacity"
                      />
                    </div>
                  </div>
                  {localProperties.texture === 'soft' && (
                    <div className={styles.controlGroup.container}>
                      <span className={styles.controlGroup.label}>Hardness</span>
                      <div className="w-[120px]">
                        <SmallSlider
                          value={Math.round((localProperties.hardness ?? 1) * 100)}
                          onChange={(value) => handlePropertyChange("hardness", value / 100)}
                          min={1}
                          max={100}
                          step={1}
                          label="Hardness"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Brush Eraser Tool Sub-toolbar */}
            {tool === "eraser" && localProperties && onPropertyChange && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-3">
                  <BrushSettingsPanel
                    currentTexture={localProperties.texture || "basic"}
                    rotation={localProperties.rotation}
                    spacing={localProperties.spacing}
                    followPath={localProperties.followPath}
                    onTextureSelect={(texture: string) => handlePropertyChange("texture", texture)}
                    onPropertyChange={handlePropertyChange}
                  />
                  <div className={styles.controlGroup.container}>
                    <span className={styles.controlGroup.label}>Size</span>
                    <div className="w-[120px]">
                      <SmallSlider
                        value={localProperties.size || 1}
                        onChange={(value) => handlePropertyChange("size", value)}
                        min={1}
                        max={100}
                        step={1}
                        label="Size"
                      />
                    </div>
                  </div>
                  <div className={styles.controlGroup.container}>
                    <span className={styles.controlGroup.label}>Opacity</span>
                    <div className="w-[120px]">
                      <SmallSlider
                        value={(localProperties.opacity || 0) * 100}
                        onChange={(value) => handlePropertyChange("opacity", value / 100)}
                        min={0}
                        max={100}
                        step={1}
                        label="Opacity"
                      />
                    </div>
                  </div>
                  {localProperties.texture === 'soft' && (
                    <div className={styles.controlGroup.container}>
                      <span className={styles.controlGroup.label}>Hardness</span>
                      <div className="w-[120px]">
                        <SmallSlider
                          value={Math.round((localProperties.hardness ?? 1) * 100)}
                          onChange={(value) => handlePropertyChange("hardness", value / 100)}
                          min={1}
                          max={100}
                          step={1}
                          label="Hardness"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-0.5" />
                <Tooltip content="Clear Brush Strokes" side="top">
                  <button
                    className="text-[10px] font-medium tracking-wide uppercase text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    onClick={() => {
                      // Find the active image shape
                      const activeShape = shapes.find(s => 
                        selectedShapes.includes(s.id) && 
                        (s.type === "image" || s.type === "sketchpad")
                      );
                      
                      if (activeShape) {
                        // Find the permanent strokes canvas element
                        const permanentCanvas = document.querySelector(
                          `canvas[data-shape-id="${activeShape.id}"][data-layer="permanent"]`
                        ) as HTMLCanvasElement;
                        
                        if (permanentCanvas) {
                          // Clear the permanent strokes canvas
                          const ctx = permanentCanvas.getContext('2d');
                          if (ctx) {
                            ctx.clearRect(0, 0, permanentCanvas.width, permanentCanvas.height);
                          }
                          
                          // Update the shape state
                          updateShape(activeShape.id, {
                            permanentCanvasData: permanentCanvas.toDataURL('image/png')
                          });
                          
                          // Update preview
                          const previewCanvas = document.querySelector(
                            `canvas[data-shape-id="${activeShape.id}"][data-layer="preview"]`
                          ) as HTMLCanvasElement;
                          
                          if (previewCanvas) {
                            const previewCtx = previewCanvas.getContext('2d');
                            if (previewCtx) {
                              previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                              // Redraw the background
                              const backgroundCanvas = document.querySelector(
                                `canvas[data-shape-id="${activeShape.id}"][data-layer="background"]`
                              ) as HTMLCanvasElement;
                              if (backgroundCanvas) {
                                previewCtx.drawImage(backgroundCanvas, 0, 0);
                              }
                            }
                          }
                        }
                      }
                    }}
                  >
                    Reset
                  </button>
                </Tooltip>
              </div>
            )}

            {/* In-Paint Brush Tool Sub-toolbar */}
            {tool === "inpaint" && localProperties && onPropertyChange && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-3">
                  <MiniToggle
                    id="inpaint-restore-toggle"
                    label="Restore"
                    checked={inpaintRestoreMode}
                    onChange={(checked) => setInpaintRestoreMode(checked)}
                  />
                  <div className={styles.controlGroup.container}>
                    <span className={styles.controlGroup.label}>Size</span>
                    <div className="w-[120px]">
                      <SmallSlider
                        value={localProperties.size || 1}
                        onChange={(value) => handlePropertyChange("size", value)}
                        min={1}
                        max={100}
                        step={1}
                        label="Size"
                      />
                    </div>
                  </div>
                  
                  <Tooltip content="Reset Mask" side="top">
                    <ToolbarButton
                      icon={<RefreshCw className="w-3.5 h-3.5" />}
                      onClick={() => {
                        // Find the active image shape
                        const activeShape = shapes.find(s => 
                          selectedShapes.includes(s.id) && 
                          (s.type === "image" || s.type === "sketchpad")
                        );
                        
                        if (activeShape) {
                          // Find the mask canvas element
                          const maskCanvas = document.querySelector(
                            `canvas[data-shape-id="${activeShape.id}"][data-layer="mask"]`
                          ) as HTMLCanvasElement;
                          
                          if (maskCanvas) {
                            // Reset the mask 
                            resetMask({ current: maskCanvas });
                            
                            // Save the reset mask state
                            const maskData = maskCanvas.toDataURL('image/png');
                            localStorage.setItem(`mask_${activeShape.id}`, maskData);
                            useStore.getState().updateShape(activeShape.id, { maskCanvasData: maskData });
                            
                            // Update preview
                            const previewCanvas = document.querySelector(
                              `canvas[data-shape-id="${activeShape.id}"][data-layer="preview"]`
                            ) as HTMLCanvasElement;
                            
                            if (previewCanvas) {
                              // Apply the reset mask to the preview
                              previewCanvas.style.webkitMaskImage = `url(${maskData})`;
                              previewCanvas.style.maskImage = `url(${maskData})`;
                              previewCanvas.style.webkitMaskSize = 'cover';
                              previewCanvas.style.maskSize = 'cover';
                              previewCanvas.style.webkitMaskPosition = 'center';
                              previewCanvas.style.maskPosition = 'center';
                            }
                          }
                        }
                      }}
                      className={styles.button}
                    />
                  </Tooltip>
                </div>
              </div>
            )}

            {/* Group/Ungroup buttons */}
            {selectedShapes.length > 1 && !selectedShapesInGroup && (
              <Tooltip content="Group Shapes" side="top">
                <ToolbarButton
                  icon={
                    <div className="flex items-center gap-1.5">
                      <Group className="w-4 h-4" />
                      <span className="text-sm">Group Shapes</span>
                    </div>
                  }
                  onClick={() => displayActions.createGroup(selectedShapes)}
                  className={styles.button}
                />
              </Tooltip>
            )}

            {displayShape?.type === "group" && (
              <Tooltip content="Ungroup" side="top">
                <ToolbarButton
                  icon={
                    <div className="flex items-center gap-1.5">
                      <Ungroup className="w-4 h-4" />
                      <span className="text-sm">Ungroup</span>
                    </div>
                  }
                  onClick={() => displayActions.ungroup(displayShape.id)}
                  className={styles.button}
                />
              </Tooltip>
            )}

            {selectedShapesInGroup && (
              <Tooltip content="Remove from Group" side="top">
                <ToolbarButton
                  icon={
                    <div className="flex items-center gap-1.5">
                      <Ungroup className="w-4 h-4" />
                      <span className="text-sm">Remove from Group</span>
                    </div>
                  }
                  onClick={() => displayActions.removeFromGroup(selectedShapes)}
                  className={styles.button}
                />
              </Tooltip>
            )}

            {hasGroupAndShapes && selectedGroup && shapesToAdd.length > 0 && (
              <Tooltip content="Add to Group" side="top">
                <ToolbarButton
                  icon={
                    <div className="flex items-center gap-1.5">
                      <Group className="w-4 h-4" />
                      <span className="text-sm">Add to Group</span>
                    </div>
                  }
                  onClick={() => displayActions.addToGroup(shapesToAdd, selectedGroup.id)}
                  className={styles.button}
                />
              </Tooltip>
            )}

            {/* 3D Depth */}
            {displayShape?.type === "image" && displayShape.depthPreviewUrl && (
              <Tooltip content="Create 3D Depth" side="top">
                <ToolbarButton
                  icon={<Box className="w-4 h-4" />}
                  onClick={() => {
                    const newX = displayShape.position.x + displayShape.width + 20;
                    displayActions.create3DDepth(displayShape, {
                      x: newX,
                      y: displayShape.position.y,
                    });
                  }}
                  className={styles.button}
                />
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};