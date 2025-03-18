import { Shape, Position, ToolContext } from './shapes';

export interface CanvasState {
  activeToolContext: ToolContext;
  shapes: Shape[];
  selectedShapes: string[];
  zoom: number;
  offset: Position;
  isDragging: boolean;
  tool: "select" | "pan" | "pen" | "brush" | "eraser";
  locked: boolean;
  history: Shape[][];
  historyIndex: number;
  gridEnabled: boolean;
  gridSize: number;
  clipboard: Shape[];
  currentColor: string;
  strokeWidth: number;
  isEditingText: boolean;
  setIsEditingText: (isEditing: boolean) => void;
  setShapes: (shapes: Shape[]) => void;
  addShape: (shape: Shape) => void;
  addShapes: (shapes: Shape[]) => void;
  updateShape: (id: string, shape: Partial<Shape>) => void;
  updateShapes: (updates: { id: string; shape: Partial<Shape> }[]) => void;
  removeShape: (id: string) => void;
  removeShapes: (ids: string[]) => void;
  clearShapes: () => void;
  setSelectedShapes: (ids: string[]) => void;
  addSelectedShape: (id: string) => void;
  removeSelectedShape: (id: string) => void;
  clearSelectedShapes: () => void;
  setZoom: (zoom: number) => void;
  setOffset: (offset: Position) => void;
  setIsDragging: (isDragging: boolean) => void;
  setTool: (tool: CanvasState['tool']) => void;
  setLocked: (locked: boolean) => void;
  addToHistory: (shapes: Shape[]) => void;
  undo: () => void;
  redo: () => void;
  setGridEnabled: (enabled: boolean) => void;
  setGridSize: (size: number) => void;
  setClipboard: (shapes: Shape[]) => void;
  setCurrentColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setActiveToolContext: (context: ToolContext) => void;
  clearActiveToolContext: () => void;
  startDragging: (x: number, y: number, initialPositions: Map<string, Position>) => void;
  stopDragging: () => void;
  updateShapePositions: (positions: Map<string, Position>) => void;
  updateShapeSize: (id: string, width: number, height: number) => void;
  updateShapeRotation: (id: string, rotation: number) => void;
  updateShapeColor: (id: string, color: string) => void;
  updateShapeContent: (id: string, content: string) => void;
  updateShapeFontSize: (id: string, fontSize: number) => void;
  updateShapeStrokeWidth: (id: string, strokeWidth: number) => void;
  updateShapePoints: (id: string, points: Position[]) => void;
  updateShapeImageUrl: (id: string, imageUrl: string) => void;
  updateShapeAspectRatio: (id: string, aspectRatio: number) => void;
  updateShapeOriginalDimensions: (id: string, width: number, height: number) => void;
  updateShapeThumbnailUrl: (id: string, thumbnailUrl: string) => void;
  updateShapeGroupId: (id: string, groupId: string) => void;
  updateShapeIsGroup: (id: string, isGroup: boolean) => void;
  updateShapeMergedFrom: (id: string, mergedFrom: string[]) => void;
  updateShapeIsMerged: (id: string, isMerged: boolean) => void;
  updateShapeLastUpdated: (id: string, lastUpdated: string) => void;
  updateShape3DProperties: (
    id: string,
    properties: {
      depthMap?: string;
      displacementScale?: number;
      orbitControls?: {
        autoRotate?: boolean;
        autoRotateSpeed?: number;
        enableZoom?: boolean;
        enablePan?: boolean;
      };
      lighting?: {
        intensity?: number;
        position?: Position;
        color?: string;
      };
      camera?: {
        position?: Position & { z: number };
        fov?: number;
      };
      isOrbiting?: boolean;
    }
  ) => void;
  updateShapeProcessingStates: (
    id: string,
    states: {
      isDepthProcessing?: boolean;
      isEdgeProcessing?: boolean;
      isPoseProcessing?: boolean;
      isSketchProcessing?: boolean;
      hasDepthGenerated?: boolean;
      hasEdgeGenerated?: boolean;
      hasPoseGenerated?: boolean;
      hasSketchGenerated?: boolean;
    }
  ) => void;
  updateShapeUrls: (
    id: string,
    urls: {
      depthMapUrl?: string;
      edgeMapUrl?: string;
      poseMapUrl?: string;
      sketchMapUrl?: string;
      depthPreviewUrl?: string;
      edgePreviewUrl?: string;
      posePreviewUrl?: string;
      sketchPreviewUrl?: string;
    }
  ) => void;
  updateShapeStrengths: (
    id: string,
    strengths: {
      depthStrength?: number;
      edgesStrength?: number;
      contentStrength?: number;
      poseStrength?: number;
      sketchStrength?: number;
      imagePromptStrength?: number;
    }
  ) => void;
  updateShapeVisibility: (
    id: string,
    visibility: {
      showPrompt?: boolean;
      showNegativePrompt?: boolean;
      showDepth?: boolean;
      showEdges?: boolean;
      showContent?: boolean;
      showPose?: boolean;
      showSketch?: boolean;
      showImagePrompt?: boolean;
      imagePromptStrength?: number;
    }
  ) => void;
  updateShapeGenerationSettings: (
    id: string,
    settings: {
      scheduler?: string;
      seed?: number;
      steps?: number;
      guidanceScale?: number;
      outputFormat?: string;
      outputQuality?: number;
      randomiseSeeds?: boolean;
      negativePrompt?: string;
      outputWidth?: number;
      outputHeight?: number;
    }
  ) => void;
} 