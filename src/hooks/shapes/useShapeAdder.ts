// src/hooks/useShapeAdder.ts
import { Shape, Position } from "../../types/shapes";
import { useStore } from "../../store";
import { getImageDimensions } from "../../utils/image";
import { findOpenSpace } from "../../utils/spaceUtils";

// Add utility function for consistent sizing
const calculateImageShapeDimensions = (width: number, height: number): { width: number; height: number } => {
  const MAX_DIMENSION = 512;
  const aspectRatio = width / height;
  
  let scaledWidth: number;
  let scaledHeight: number;
  
  if (aspectRatio > 1) {
    // Width is larger than height
    scaledWidth = MAX_DIMENSION;
    scaledHeight = Math.round(MAX_DIMENSION / aspectRatio);
  } else {
    // Height is larger than or equal to width
    scaledHeight = MAX_DIMENSION;
    scaledWidth = Math.round(MAX_DIMENSION * aspectRatio);
  }
  
  return { width: scaledWidth, height: scaledHeight };
};

interface ShapeAddOptions {
  position?: Position;
  defaultWidth?: number;
  centerOnShape?: boolean;
  setSelected?: boolean;
  startEditing?: boolean;
}

export function useShapeAdder() {
  const addShape = useStore((state) => state.addShape);
  const setSelectedShapes = useStore((state) => state.setSelectedShapes);
  const shapes = useStore((state) => state.shapes);
  const zoom = useStore((state) => state.zoom);
  const offset = useStore((state) => state.offset);
  const setOffset = useStore((state) => state.setOffset);

  const addNewShape = async (
    type: Shape["type"],
    props: Partial<Shape>,
    content: string = "",
    options: ShapeAddOptions = {}
  ) => {
    const {
      position,
      defaultWidth = 200,
      centerOnShape: shouldCenterOnShape = false,
      setSelected = false,
      startEditing = false,
    } = options;

    // Calculate dimensions based on type
    let width = defaultWidth;
    let height = defaultWidth;

    if (type === "image" && props.imageUrl) {
      const dimensions = await getImageDimensions(props.imageUrl);
      const scaledDimensions = calculateImageShapeDimensions(dimensions.width, dimensions.height);
      width = scaledDimensions.width;
      height = scaledDimensions.height;
    }

    // Calculate view center
    const viewCenter = {
      x: (-offset.x + window.innerWidth / 2) / zoom,
      y: (-offset.y + window.innerHeight / 2) / zoom,
    };

    // Find open space for the shape
    const openPosition = findOpenSpace(shapes, width, height, viewCenter);

    const newShape: Shape = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      position: position || openPosition,
      width,
      height,
      rotation: 0,
      color: "#ffffff",
      isEditing: startEditing,
      model: "",
      useSettings: false,
      isUploading: false,
      contentStrength: 0.75,
      sketchStrength: 0.75,
      imagePromptStrength: 0.75,
      depthStrength: 0.75,
      edgesStrength: 0.75,
      poseStrength: 0.75,
      showDepth: false,
      showEdges: false,
      showPose: false,
      showSketch: false,
      showImagePrompt: false,
      isResized: type === "image" ? false : undefined,
      ...props,
      content: content || props.content,
    };

    addShape(newShape);

    if (setSelected) {
      setSelectedShapes([newShape.id]);
    }

    if (shouldCenterOnShape) {
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
    }

    return newShape;
  };

  return { addNewShape };
}
