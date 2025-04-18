import { Shape, Position } from "../../types";
import { ImageShape, StickyNoteShape } from "../../types/shapes";
import { getShapeCanvases } from "./CanvasUtils";

interface ShapeDimensions {
  width: number;
  height: number;
}

export class ShapeProcessor {
  private static readonly GAP = 20; // Standard gap between shapes
  private static readonly BASE_OFFSET = 40; // Base offset for overlapping shapes
  private static readonly MAX_DIMENSION = 512; // Maximum dimension for image shapes

  /**
   * Standard aspect ratio presets with optimal dimensions
   */
  private static readonly ASPECT_RATIO_PRESETS = {
    "Square (1:1)": { width: 1024, height: 1024, ratio: 1 },
    "Landscape SD (4:3)": { width: 1176, height: 888, ratio: 1.324 },
    "Widescreen IMAX (1.43:1)": { width: 1224, height: 856, ratio: 1.43 },
    "Widescreen HD (16:9)": { width: 1360, height: 768, ratio: 1.77 },
    "Golden Ratio (1.618:1)": { width: 1296, height: 800, ratio: 1.62 },
    "Portrait (2:3)": { width: 832, height: 1248, ratio: 0.667 },
    "Portrait Standard (3:4)": { width: 880, height: 1176, ratio: 0.748 },
    "Portrait Large Format (4:5)": { width: 912, height: 1144, ratio: 0.797 },
    "Portrait Social Video (9:16)": { width: 768, height: 1360, ratio: 0.565 }
  };

  /**
   * Calculates the dimensions of a shape
   */
  static getShapeDimensions(shape: Shape): ShapeDimensions {
    if (shape.type === "diffusionSettings") {
      return {
        width: 200,
        height: shape.showAdvanced ? 400 : 200
      };
    }
    return {
      width: shape.width,
      height: shape.height
    };
  }

  /**
   * Calculates the position for a new shape based on a reference shape
   */
  static calculatePositionFromReference(
    referenceShape: Shape,
    newShapeDimensions: ShapeDimensions,
    shapes: Shape[]
  ): Position {
    const initialPosition = {
      x: referenceShape.position.x + this.getShapeDimensions(referenceShape).width + this.GAP,
      y: referenceShape.position.y
    };

    const overlappingShapes = this.findOverlappingShapes(
      shapes,
      initialPosition,
      newShapeDimensions
    );

    if (overlappingShapes.length === 0) {
      return initialPosition;
    }

    const hasEnabledOverlappingShape = overlappingShapes.some(shape => this.hasEnabledToggles(shape));
    
    if (hasEnabledOverlappingShape) {
      return this.calculatePositionBelowShapes(shapes, initialPosition, newShapeDimensions);
    }

    return this.calculateProgressiveOffset(overlappingShapes[0], overlappingShapes.length);
  }

  /**
   * Finds shapes that overlap with a proposed position
   */
  static findOverlappingShapes(
    shapes: Shape[],
    position: Position,
    dimensions: ShapeDimensions
  ): Shape[] {
    return shapes.filter(shape => {
      const shapeDimensions = this.getShapeDimensions(shape);
      const shapeRight = shape.position.x + shapeDimensions.width;
      const shapeBottom = shape.position.y + shapeDimensions.height;
      const proposedRight = position.x + dimensions.width;
      const proposedBottom = position.y + dimensions.height;

      return !(
        position.x > shapeRight ||
        proposedRight < shape.position.x ||
        position.y > shapeBottom ||
        proposedBottom < shape.position.y
      );
    });
  }

  /**
   * Calculates a position below existing shapes
   */
  static calculatePositionBelowShapes(
    shapes: Shape[],
    initialPosition: Position,
    dimensions: ShapeDimensions
  ): Position {
    const bottomMostPoint = shapes.reduce((maxBottom, shape) => {
      const shapeDimensions = this.getShapeDimensions(shape);
      const shapeRight = shape.position.x + shapeDimensions.width;
      const shapeBottom = shape.position.y + shapeDimensions.height;
      
      if (initialPosition.x < shapeRight && 
          (initialPosition.x + dimensions.width) > shape.position.x) {
        return Math.max(maxBottom, shapeBottom);
      }
      return maxBottom;
    }, initialPosition.y);

    return {
      x: initialPosition.x,
      y: bottomMostPoint + this.GAP
    };
  }

  /**
   * Calculates a progressive offset for overlapping shapes
   */
  static calculateProgressiveOffset(
    referenceShape: Shape,
    overlapCount: number
  ): Position {
    const offset = this.BASE_OFFSET * overlapCount;
    return {
      x: referenceShape.position.x + offset,
      y: referenceShape.position.y + offset
    };
  }

  /**
   * Calculates the target offset to center a shape in the viewport
   */
  static calculateCenteringOffset(
    position: Position,
    dimensions: ShapeDimensions,
    zoom: number
  ): Position {
    return {
      x: -(position.x + dimensions.width/2) * zoom + window.innerWidth / 2,
      y: -(position.y + dimensions.height/2) * zoom + window.innerHeight / 2 - (dimensions.height * zoom * 0.2)
    };
  }

  /**
   * Checks if a shape has any enabled toggles
   */
  static hasEnabledToggles(shape: Shape): boolean {
    return (
      (shape.type === "image" && (shape.showImagePrompt || shape.makeVariations)) ||
      (shape.type === "depth" && shape.showDepth === true) ||
      (shape.type === "edges" && shape.showEdges === true) ||
      (shape.type === "pose" && shape.showPose === true) ||
      (shape.type === "sticky" && shape.isTextPrompt === true) ||
      (shape.type === "diffusionSettings" && shape.useSettings) ||
      shape.showContent === true ||
      shape.showSketch === true
    );
  }

  /**
   * Calculates dimensions for an image shape while maintaining aspect ratio
   */
  static calculateImageShapeDimensions(width: number, height: number): ShapeDimensions {
    const aspectRatio = width / height;
    
    if (aspectRatio > 1) {
      return {
        width: this.MAX_DIMENSION,
        height: Math.round(this.MAX_DIMENSION / aspectRatio)
      };
    }
    
    return {
      width: Math.round(this.MAX_DIMENSION * aspectRatio),
      height: this.MAX_DIMENSION
    };
  }

  /**
   * Creates a placeholder shape for generation
   */
  static createPlaceholderShape(
    id: string,
    position: Position,
    dimensions: ShapeDimensions
  ): ImageShape {
    return {
      id,
      type: "image",
      position,
      width: dimensions.width,
      height: dimensions.height,
      isUploading: true,
      imageUrl: "",
      color: "transparent",
      rotation: 0,
      model: "",
      useSettings: false,
      isEditing: false,
      depthStrength: 0,
      edgesStrength: 0,
      contentStrength: 0,
      poseStrength: 0,
      sketchStrength: 0,
      imagePromptStrength: 0,
      showDepth: false,
      showEdges: false,
      showPose: false,
      showSketch: false,
      showImagePrompt: false,
    };
  }

  /**
   * Maps a given aspect ratio to the closest standard preset
   */
  static mapToStandardAspectRatio(width: number, height: number): ShapeDimensions {
    const aspectRatio = width / height;
    
    // Find the preset with the closest aspect ratio
    let closestPreset = null;
    let minDifference = Infinity;
    
    for (const preset of Object.values(this.ASPECT_RATIO_PRESETS)) {
      const difference = Math.abs(preset.ratio - aspectRatio);
      if (difference < minDifference) {
        minDifference = difference;
        closestPreset = preset;
      }
    }
    
    // Get aspect ratio from the closest preset
    const presetRatio = closestPreset!.ratio;
    
    // Scale dimensions to fit within 512x512 area while maintaining aspect ratio
    let scaledWidth, scaledHeight;
    
    if (presetRatio >= 1) {
      // Landscape or square orientation
      scaledWidth = 512;
      scaledHeight = Math.round(scaledWidth / presetRatio);
    } else {
      // Portrait orientation
      scaledHeight = 512;
      scaledWidth = Math.round(scaledHeight * presetRatio);
    }
    
    return {
      width: scaledWidth,
      height: scaledHeight
    };
  }

  /**
   * Calculates average aspect ratio and dimensions from enabled control shapes
   */
  static calculateAverageAspectRatio(shapes: Shape[]): ShapeDimensions | null {
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
        return this.mapToStandardAspectRatio(sourceShape.width, sourceShape.height);
      }
    }

    // Calculate average dimensions from all enabled shapes
    const totalWidth = enabledShapes.reduce((sum, shape) => sum + shape.width, 0);
    const totalHeight = enabledShapes.reduce((sum, shape) => sum + shape.height, 0);
    const avgWidth = totalWidth / enabledShapes.length;
    const avgHeight = totalHeight / enabledShapes.length;

    // Map to standard aspect ratio instead of custom calculations
    return this.mapToStandardAspectRatio(avgWidth, avgHeight);
  }

  /**
   * Finds a sticky note with a text prompt
   */
  static findStickyWithPrompt(shapes: Shape[]): StickyNoteShape | undefined {
    return shapes.find(
      (shape): shape is StickyNoteShape => 
        shape.type === "sticky" && 
        shape.isTextPrompt === true && 
        (shape as StickyNoteShape).content !== undefined
    );
  }

  /**
   * Finds a sticky note with a negative prompt
   */
  static findStickyWithNegativePrompt(shapes: Shape[]): StickyNoteShape | undefined {
    return shapes.find(
      (shape): shape is StickyNoteShape =>
        shape.type === "sticky" && 
        shape.isNegativePrompt === true && 
        (shape as StickyNoteShape).content !== undefined
    );
  }

  /**
   * Checks if a shape has a valid inpainting mask (contains both black and white pixels)
   */
  static hasValidInpaintMask(shape: Shape): boolean {
    // Only image shapes can have inpainting masks
    if (shape.type !== "image" && shape.type !== "sketchpad") {
      return false;
    }
    
    // Get canvases for the shape
    const canvases = getShapeCanvases(shape.id);
    
    // Need both preview and mask canvases
    if (!canvases.mask || !canvases.preview) {
      return false;
    }
    
    // Check mask for black pixels
    const ctx = canvases.mask.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;
    
    const imageData = ctx.getImageData(0, 0, canvases.mask.width, canvases.mask.height);
    const data = imageData.data;
    
    let hasBlack = false;
    let hasWhite = false;
    
    // Check pixels - need both black and white for valid inpainting
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i+3];
      
      // Check for black areas (transparent in mask)
      if (alpha < 10) {
        hasBlack = true;
      }
      // Check for white areas (opaque in mask)
      else if (alpha > 240) {
        hasWhite = true;
      }
      
      // If we found both black and white areas, this is a valid inpainting mask
      if (hasBlack && hasWhite) {
        return true;
      }
    }
    
    // If we got here, the mask doesn't have both black and white
    return false;
  }
} 