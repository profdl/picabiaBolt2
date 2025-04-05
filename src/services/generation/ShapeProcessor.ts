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
  private static readonly MIN_DIMENSION = 512; // Minimum dimension for SDXL
  private static readonly MAX_SDXL_DIMENSION = 2048; // Maximum dimension for SDXL

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
        return this.calculateImageShapeDimensions(sourceShape.width, sourceShape.height);
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
    roundedWidth = Math.max(roundedWidth, this.MIN_DIMENSION);
    roundedHeight = Math.max(roundedHeight, this.MIN_DIMENSION);

    // Ensure maximum dimensions for SDXL
    roundedWidth = Math.min(roundedWidth, this.MAX_SDXL_DIMENSION);
    roundedHeight = Math.min(roundedHeight, this.MAX_SDXL_DIMENSION);

    return { width: roundedWidth, height: roundedHeight };
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