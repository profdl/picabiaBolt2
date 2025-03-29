// src/hooks/useShapeAdder.ts
import { Shape, Position } from "../../types";
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

// Update utility function to check if a shape has any toggles enabled
const hasEnabledToggles = (shape: Shape): boolean => {
  return (
    (shape.type === "image" && (shape.showImagePrompt || shape.makeVariations)) ||
    (shape.type === "depth" && shape.showDepth === true) ||
    (shape.type === "edges" && shape.showEdges === true) ||
    (shape.type === "pose" && shape.showPose === true) ||
    (shape.type === "sticky" && (
      (shape.isTextPrompt && shape.content && shape.content.trim() !== "") ||
      (shape.isNegativePrompt && shape.content && shape.content.trim() !== "")
    )) ||
    (shape.type === "diffusionSettings" && shape.useSettings) ||
    shape.showContent === true ||
    shape.showSketch === true
  );
};

// Add utility function to get shape dimensions
const getShapeDimensions = (shape: Shape): { width: number; height: number } => {
  if (shape.type === "diffusionSettings") {
    // DiffusionSettingsPanel has a fixed width and expands vertically based on advanced settings
    return {
      width: 200, // Fixed width for diffusion settings panel
      height: shape.showAdvanced ? 400 : 200 // Height varies based on advanced settings visibility
    };
  }
  return {
    width: shape.width,
    height: shape.height
  };
};

// Update utility function to find the top-right most shape with enabled toggles
const findTopRightMostShapeWithToggles = (shapes: Shape[]): Shape | null => {
  let topRightMostShape: Shape | null = null;
  let topRightMostScore = -Infinity;

  shapes.forEach(shape => {
    if (hasEnabledToggles(shape)) {
      // Calculate a score that prioritizes higher y-position (lower y value) and higher x-position
      // We multiply y by -1 to make lower y values score higher
      const score = -shape.position.y + (shape.position.x * 0.1);
      
      if (score > topRightMostScore) {
        topRightMostShape = shape;
        topRightMostScore = score;
      }
    }
  });

  return topRightMostShape;
};

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
    } else if (type === "diffusionSettings") {
      // Set fixed dimensions for diffusion settings panel
      width = 200;
      height = props.showAdvanced ? 400 : 200;
    }

    // Find the top-right most shape with enabled toggles
    const topRightMostShape = findTopRightMostShapeWithToggles(shapes);
    
    // Calculate position based on top-right most shape with toggles or view center
    let finalPosition: Position;
    if (topRightMostShape && !position) {
      // Calculate initial position to the right of the top-right most shape
      const GAP = 20; // Gap between shapes
      const initialPosition = {
        x: topRightMostShape.position.x + getShapeDimensions(topRightMostShape).width + GAP,
        y: topRightMostShape.position.y
      };

      // Check if there's any shape at the initial position
      const hasShapeAtPosition = shapes.some(shape => {
        const shapeDimensions = getShapeDimensions(shape);
        const shapeRight = shape.position.x + shapeDimensions.width;
        const shapeBottom = shape.position.y + shapeDimensions.height;
        const initialRight = initialPosition.x + width;
        const initialBottom = initialPosition.y + height;

        // Check for overlap
        return !(
          initialPosition.x > shapeRight ||
          initialRight < shape.position.x ||
          initialPosition.y > shapeBottom ||
          initialBottom < shape.position.y
        );
      });

      if (hasShapeAtPosition) {
        // Find the bottom-most point of any shapes in this vertical column
        const bottomMostPoint = shapes.reduce((maxBottom, shape) => {
          // Only consider shapes that overlap horizontally with our target position
          const shapeDimensions = getShapeDimensions(shape);
          const shapeRight = shape.position.x + shapeDimensions.width;
          const shapeBottom = shape.position.y + shapeDimensions.height;
          
          if (initialPosition.x < shapeRight && 
              (initialPosition.x + width) > shape.position.x) {
            return Math.max(maxBottom, shapeBottom);
          }
          return maxBottom;
        }, initialPosition.y);

        // Place the new shape below the bottom-most point
        finalPosition = {
          x: initialPosition.x,
          y: bottomMostPoint + GAP
        };
      } else {
        finalPosition = initialPosition;
      }
    } else {
      // Calculate view center
      const viewCenter = {
        x: (-offset.x + window.innerWidth / 2) / zoom,
        y: (-offset.y + window.innerHeight / 2) / zoom,
      };

      // Find open space for the shape
      finalPosition = position || findOpenSpace(shapes, width, height, viewCenter);
    }

    const newShape: Shape = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      position: finalPosition,
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
