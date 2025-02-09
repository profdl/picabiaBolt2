// src/hooks/useShapeAdder.ts
import { useStore } from '../store';
import { Position, Shape } from '../types';
import { DEFAULT_CONTROL_STRENGTHS } from '../constants/shapeControlSettings';
import { getImageDimensions } from '../utils/image'; 

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
    setOffset,
    
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
    shapeData: Partial<Shape> = {},
    url: string = '',
    options: ShapeAddOptions = { animate: true }
  ) => {
    let width = options.defaultWidth || 300;
    let height = width;
    let aspectRatio = 1;

    // Only fetch image dimensions if it's an image type and has a URL
    if (shapeType === 'image' && url) {
      try {
        const dimensions = await getImageDimensions(url);
        aspectRatio = dimensions.width / dimensions.height;
        height = width / aspectRatio;
      } catch (error) {
        console.error('Failed to get image dimensions:', error);
      }
    } else {
      // For non-image shapes, use default dimensions
      if (shapeType === 'sticky') {
        width = 200;
        height = 200;
      } else if (shapeType === 'sketchpad') {
        width = 400;
        height = 400;
      } else if (shapeType === 'diffusionSettings') {
        width = 300;
        height = 200;
      }
    }

    const center = getViewportCenter();
    const shapeId = Math.random().toString(36).substr(2, 9);

    const findOpenSpace = (height: number, center: Position): Position => {
      const PADDING = 20;
      const rightBoundary = Math.max(...shapes.map(s => s.position.x + s.width), 0);
    
      return {
        x: rightBoundary + PADDING,
        y: center.y - height / 2,
      };
    };

    const position = options.position || findOpenSpace(height, center);

    const stickyDefaults = shapeType === 'sticky' ? {
      showPrompt: true,
      color: 'var(--sticky-green)',
      content: 'Double-Click to Edit...',
      // Uncheck any existing sticky notes' text prompts
      ...(() => {
        const { updateShape } = useStore.getState(); // Get updateShape from the store state
        shapes.forEach(shape => {
          if (shape.type === 'sticky' && shape.showPrompt) {
            updateShape(shape.id, {
              showPrompt: false,
              color: shape.showNegativePrompt ? 'var(--sticky-red)' : 'var(--sticky-yellow)'
            });
          }
        });
        return {};
      })()
    } : {};

  const newShape: Shape = {
    id: shapeId,
    type: shapeType,
    position,
    width,
    height,
    rotation: 0,
    isUploading: false,
    model: "",
    isEditing: Boolean(options.startEditing),
    color: shapeType === 'sticky' ? 'var(--sticky-green)' : 'transparent',
    ...DEFAULT_CONTROL_STRENGTHS,
    ...stickyDefaults,
    ...shapeData,
  };

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
