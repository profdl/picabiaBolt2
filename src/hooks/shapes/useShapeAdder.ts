// src/hooks/useShapeAdder.ts
import { Shape, Position } from "../../types";
import { useStore } from "../../store";
import { shapeLayout, LAYOUT_CONSTANTS } from "../../utils/shapeLayout";
import { getImageDimensions } from "../../utils/image";

interface ShapeAddOptions {
  animate?: boolean;
  position?: Position;
  defaultWidth?: number;
  centerOnShape?: boolean;
  setSelected?: boolean;
  startEditing?: boolean;
}

export function useShapeAdder() {
  const {
    addShape,
    zoom,
    offset,
    shapes,
    setOffset,
  } = useStore();

  const getViewportCenter = () => shapeLayout.getViewportCenter(zoom, offset);

  const animateToShape = (shape: Shape) => {
    const targetOffset = shapeLayout.calculateCenteringOffset(shape, zoom);
    const startOffset = { ...offset };
    const duration = 500;
    const start = performance.now();

    const animate = (currentTime: number) => {
      const progress = Math.min((currentTime - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Cubic easing

      const currentOffset = {
        x: startOffset.x + (targetOffset.x - startOffset.x) * eased,
        y: startOffset.y + (targetOffset.y - startOffset.y) * eased
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
    let width = options.defaultWidth || LAYOUT_CONSTANTS.DEFAULT.WIDTH;
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

    const position = options.position || shapeLayout.findOpenSpace(
      shapes,
      width,
      height,
      center
    );

    const newShape: Shape = {
      id: shapeId,
      type: shapeType,
      position,
      width,
      height,
      color: "transparent",
      rotation: 0,
      imageUrl: "",
      model: "",
      useSettings: false,
      isUploading: false,
      isEditing: false,
      depthStrength: 0.75,
      edgesStrength: 0.75,
      contentStrength: 0.75,
      poseStrength: 0.75,
      sketchStrength: 0.75,
      aspectRatio,
      ...shapeData
    };

    addShape(newShape);

    if (options.animate) {
      animateToShape(newShape);
    }

    return newShape;
  };

  return {
    addNewShape,
    getViewportCenter,
    animateToShape
  };
}
