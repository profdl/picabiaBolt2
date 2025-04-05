import { Shape } from "../../types";
import { StickyNoteShape, ImageShape } from "../../types/shapes";

// Add utility function to get shape dimensions
export const getShapeDimensions = (shape: Shape): { width: number; height: number } => {
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

// Add utility function to check if a shape has any toggles enabled
export const hasEnabledToggles = (shape: Shape): boolean => {
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

// Add utility function to find the top-right most shape with enabled toggles
export const findTopRightMostShapeWithToggles = (shapes: Shape[]): Shape | null => {
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

export const calculateImageShapeDimensions = (width: number, height: number): { width: number; height: number } => {
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

export const calculateAverageAspectRatio = (shapes: Shape[]) => {
  // Find all enabled control shapes
  const enabledShapes = shapes.filter(shape => {
    const isControlShape = shape.type === 'image' || shape.type === 'depth' || shape.type === 'edges' || shape.type === 'pose';
    const isEnabled = (shape.type === 'image' && (shape.showImagePrompt || shape.makeVariations)) ||
                     (shape.type === 'depth' && shape.showDepth) ||
                     (shape.type === 'edges' && shape.showEdges) ||
                     (shape.type === 'pose' && shape.showPose);
    return isControlShape && isEnabled;
  });

  if (enabledShapes.length === 0) return null;

  // Calculate dimensions based on the source image for processed shapes
  const processedShapes = enabledShapes.filter(shape => 
    (shape.type === 'depth' || shape.type === 'edges' || shape.type === 'pose') && 
    shape.sourceImageId
  );

  // If we have processed shapes, use their source image dimensions
  if (processedShapes.length > 0) {
    const sourceShape = shapes.find(s => s.id === processedShapes[0].sourceImageId);
    if (sourceShape) {
      const dimensions = calculateImageShapeDimensions(sourceShape.width, sourceShape.height);
      return dimensions;
    }
  }

  // Calculate average dimensions from all enabled shapes
  const totalWidth = enabledShapes.reduce((sum, shape) => sum + shape.width, 0);
  const totalHeight = enabledShapes.reduce((sum, shape) => sum + shape.height, 0);
  const avgWidth = totalWidth / enabledShapes.length;
  const avgHeight = totalHeight / enabledShapes.length;

  // Round to nearest power of 2 and ensure SDXL compatibility
  const roundToPowerOf2 = (num: number) => {
    return Math.pow(2, Math.round(Math.log2(num)));
  };

  let roundedWidth = roundToPowerOf2(avgWidth);
  let roundedHeight = roundToPowerOf2(avgHeight);

  // Ensure dimensions are compatible with SDXL (multiples of 8)
  roundedWidth = Math.round(roundedWidth / 8) * 8;
  roundedHeight = Math.round(roundedHeight / 8) * 8;

  // Ensure minimum dimensions for SDXL
  roundedWidth = Math.max(roundedWidth, 512);
  roundedHeight = Math.max(roundedHeight, 512);

  // Ensure maximum dimensions for SDXL
  roundedWidth = Math.min(roundedWidth, 2048);
  roundedHeight = Math.min(roundedHeight, 2048);

  return { width: roundedWidth, height: roundedHeight };
};

export const hasBlackPixelsInMask = async (maskCanvas: HTMLCanvasElement): Promise<boolean> => {
  const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;

  const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const data = imageData.data;

  // Check every pixel's red channel (since we're using red for the mask)
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 128) { // If red channel is less than 128 (dark), consider it black
      return true;
    }
  }
  return false;
};

export const hasActiveControls = (shapes: Shape[]): boolean => {
  return shapes.some(
    (shape) =>
      (shape.type === "image" || 
       shape.type === "sketchpad" || 
       shape.type === "depth" ||
       shape.type === "edges" ||
       shape.type === "pose") &&
      (shape.showDepth ||
        shape.showEdges ||
        shape.showPose ||
        shape.showSketch ||
        shape.showImagePrompt ||
        shape.makeVariations)
  );
};

export const findStickyWithPrompt = (shapes: Shape[]): StickyNoteShape | undefined => {
  return shapes.find(
    (shape): shape is StickyNoteShape => 
      shape.type === "sticky" && 
      shape.isTextPrompt === true && 
      (shape as StickyNoteShape).content !== undefined
  );
};

export const findStickyWithNegativePrompt = (shapes: Shape[]): StickyNoteShape | undefined => {
  return shapes.find(
    (shape): shape is StickyNoteShape =>
      shape.type === "sticky" && 
      shape.isNegativePrompt === true && 
      (shape as StickyNoteShape).content !== undefined
  );
};

export const hasControlNetControls = (shapes: Shape[]): boolean => {
  return shapes.some(shape => 
    (shape.showDepth || shape.showEdges || shape.showPose) && 
    ((shape as ImageShape).depthUrl || 
     (shape as ImageShape).edgeUrl || 
     (shape as ImageShape).poseUrl)
  );
}; 