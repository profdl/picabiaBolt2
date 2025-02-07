// src/hooks/useShapeAdder.ts
import { useStore } from '../store';
import { Position, Shape } from '../types';
import { DEFAULT_CONTROL_STRENGTHS } from '../constants/shapeControlSettings';

interface ShapeAddOptions {
  position?: Position;
  defaultWidth?: number;
  centerOnShape?: boolean;
  setSelected?: boolean;
  startEditing?: boolean;
  animate?: boolean; // New option to control animation
}

export function useShapeAdder() {
  const {
    addShape,
    zoom,
    offset,
    setSelectedShapes,
    setIsEditingText,
    shapes,
    setOffset // Add this from store
  } = useStore();

  const getViewportCenter = (): Position => {
    const rect = document.querySelector("#root")?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    return {
      x: (rect.width / 2 - offset.x) / zoom,
      y: (rect.height / 2 - offset.y) / zoom,
    };
  };



  const animateToShape = (shape: Shape) => {
    const targetX = -(shape.position.x + shape.width / 2) * zoom + window.innerWidth / 2;
    const targetY = -(shape.position.y + shape.height / 2) * zoom + window.innerHeight / 2;
    const startOffset = { ...offset };
    const duration = 500;
    const start = performance.now();

    const animate = (currentTime: number) => {
      const progress = Math.min((currentTime - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Cubic easing

      const currentOffset = {
        x: startOffset.x + (targetX - startOffset.x) * eased,
        y: startOffset.y + (targetY - startOffset.y) * eased
      };

      setOffset(currentOffset);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  };

  const addNewShape = async (
    shapeType: Shape['type'],
    shapeData: Partial<Shape>,
    options: ShapeAddOptions = { animate: true } // Default to true
  ) => {
    const center = getViewportCenter();
    const shapeId = Math.random().toString(36).substr(2, 9);

    // Default dimensions based on shape type
    let width = options.defaultWidth;
    let height: number;

    switch (shapeType) {
      case 'sticky':
        width = width || 270; // 180 * 1.5
        height = 180;
        break;
      case 'image':
        width = width || 300;
        if (shapeData.aspectRatio) {
          height = width / shapeData.aspectRatio;
        } else {
          height = 200;
        }
        break;
      case 'sketchpad':
        width = 512;
        height = 512;
        break;
      case 'diffusionSettings':
        width = 250;
        height = 180;
        break;
      default:
        width = width || 40;
        height = width;
    }

    // Calculate position

    const findOpenSpace = (height: number, center: Position): Position => {
      const PADDING = 20;
      const rightBoundary = Math.max(...shapes.map(s => s.position.x + s.width), 0);
      
      return {
        x: rightBoundary + PADDING,
        y: center.y - height / 2,
      };
    };

    const position = options.position || findOpenSpace(height, center);


    // Construct the new shape
    const newShape: Shape = {
      id: shapeId,
      type: shapeType,
      position,
      width,
      height,
      rotation: 0,
      isUploading: false,
      model: "",
      useSettings: false,
      isEditing: Boolean(options.startEditing),
      color: shapeType === 'sticky' ? 'var(--sticky-green)' : 'transparent',
      ...DEFAULT_CONTROL_STRENGTHS,
      ...shapeData,
    };

    // Special handling for sticky notes
    if (shapeType === 'sticky') {
      newShape.content = shapeData.content || "Double-Click to Edit...";
      newShape.showPrompt = true;
      
      // Uncheck other sticky notes
      shapes.forEach(shape => {
        if (shape.type === 'sticky' && shape.showPrompt) {
          shape.showPrompt = false;
          shape.color = shape.showNegativePrompt ? 'var(--sticky-red)' : 'var(--sticky-yellow)';
        }
      });
    }

    // Add the shape
    addShape(newShape);

    // Handle selection and editing state
    if (options.setSelected) {
      setSelectedShapes([shapeId]);
    }
    if (options.startEditing) {
      setIsEditingText(true);
    }

    // Handle centering and animation
    if (options.centerOnShape || options.animate) {
      animateToShape(newShape);
    }

    return shapeId;
  };

  return { addNewShape, getViewportCenter };
}