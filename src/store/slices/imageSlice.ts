import { StateCreator } from "zustand";
import { Shape } from "../../types";
import { mergeImages } from '../../utils/mergeImagesShapes';

const MAX_HISTORY = 50;

interface ImageState {
  shapes: Shape[];
  history: Shape[][];
  historyIndex: number;
  selectedShapes: string[];
}

interface ImageSlice extends ImageState {
  addShape: (shape: Shape) => void;
  mergeImages: (shapeIds: string[]) => Promise<void>;
  updateImageSettings: (id: string, settings: Partial<Shape>) => void;
}

interface ImageSettings {
  showDepth?: boolean;
  showEdges?: boolean;
  showPose?: boolean;
  showSketch?: boolean;
  showImagePrompt?: boolean;
  contrast?: number;
}

export const imageSlice: StateCreator<ImageSlice, [], [], ImageSlice> = (
  set,
  get
) => ({
  shapes: [],
  history: [[]],
  historyIndex: 0,
  selectedShapes: [],

  addShape: (shape: Shape) =>
    set((state) => {
      const newShapes = [shape, ...state.shapes];
      return {
        shapes: newShapes,
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          newShapes,
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
      };
    }),

  mergeImages: async (shapeIds: string[]) => {
    const { shapes, addShape } = get();
    const imagesToMerge = shapes.filter(s => shapeIds.includes(s.id));
    
    try {
      const newShape = await mergeImages(imagesToMerge);
      addShape(newShape);
      set({ selectedShapes: [newShape.id] });
    } catch (error) {
      console.error('Error merging images:', error);
      // Here you might want to show a notification to the user
    }
  },

  updateImageSettings: (id: string, settings: Partial<Shape>) =>
    set((state) => {
      const newShapes = state.shapes.map((shape) => {
        if (shape.id === id && shape.type === "image") {
          const imageShape = shape as Shape & { type: "image" };
          const imageSettings = settings as ImageSettings;
          const updatedShape = {
            ...imageShape,
            ...settings,
            showDepth: imageSettings.showDepth ?? imageShape.showDepth ?? false,
            showEdges: imageSettings.showEdges ?? imageShape.showEdges ?? false,
            showPose: imageSettings.showPose ?? imageShape.showPose ?? false,
            showSketch: imageSettings.showSketch ?? imageShape.showSketch ?? false,
            showImagePrompt: imageSettings.showImagePrompt ?? imageShape.showImagePrompt ?? false,
            contrast: imageSettings.contrast ?? imageShape.contrast ?? 1.0,
          } as Shape;
          return updatedShape;
        }
        return shape;
      });

      return {
        shapes: newShapes,
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          newShapes,
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
      };
    }),
}); 