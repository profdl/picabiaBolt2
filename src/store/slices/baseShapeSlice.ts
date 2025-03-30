import { StateCreator } from "zustand";
import { Shape, Position, ImageShape } from "../../types";
import { shapeManagement } from '../../utils/shapeManagement';

const MAX_HISTORY = 50;

interface BaseShapeState {
  shapes: Shape[];
  selectedShapes: string[];
  history: Shape[][];
  historyIndex: number;
  zoom: number;
  offset: Position;
}

interface BaseShapeSlice extends BaseShapeState {
  setShapes: (shapes: Shape[]) => void;
  addShape: (shape: Shape) => void;
  addShapes: (shapes: Shape[]) => void;
  updateShape: (id: string, props: Partial<Shape>) => void;
  updateShapes: (updates: { id: string; shape: Partial<Shape> }[]) => void;
  deleteShape: (id: string) => void;
  deleteShapes: (ids: string[]) => void;
  setSelectedShapes: (ids: string[]) => void;
  resetState: () => void;
  undo: () => void;
  redo: () => void;
}

export const baseShapeSlice: StateCreator<BaseShapeSlice, [], [], BaseShapeSlice> = (
  set
) => ({
  shapes: [],
  selectedShapes: [],
  history: [[]],
  historyIndex: 0,
  zoom: 1,
  offset: { x: 0, y: 0 },

  setShapes: (shapes) =>
    set((state) => {
      // Validate shape data
      const validShapes = shapes.filter((shape) => {
        const hasRequiredProps = shape.id && shape.type && shape.position;
        if (!hasRequiredProps) {
          console.warn("Invalid shape:", shape);
        }
        return hasRequiredProps;
      });

      return {
        shapes: validShapes,
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          validShapes,
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
        selectedShapes: [],
      };
    }),

  addShape: (shape: Shape) =>
    set((state) => {
      // Get standardized dimensions and position
      const { position, width, height } = shapeManagement.prepareShapeAddition(
        state.shapes,
        {
          width: shape.width,
          height: shape.height,
          aspectRatio: (shape as ImageShape).aspectRatio,
          position: shape.position
        }
      );

      // Create new shape with standardized positioning
      const newShape: Shape = {
        ...shape,
        position,
        width,
        height,
      };

      // Add the shape to the beginning of the array
      const updatedShapes = [newShape, ...state.shapes];

      // Calculate centering offset for the new shape
      const centeringOffset = shapeManagement.calculateCenteringOffset(newShape, state.zoom);

      // Animate to the new center position
      const startOffset = state.offset;
      const duration = 500;
      const start = performance.now();

      const animate = (currentTime: number) => {
        const progress = Math.min((currentTime - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        const currentOffset = {
          x: startOffset.x + (centeringOffset.x - startOffset.x) * eased,
          y: startOffset.y + (centeringOffset.y - startOffset.y) * eased
        };

        set(state => ({ ...state, offset: currentOffset }));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);

      return {
        shapes: updatedShapes,
        selectedShapes: [newShape.id],
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          updatedShapes,
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
      };
    }),

  addShapes: (newShapes) =>
    set((state) => {
      const processedShapes = newShapes.map((shape) => {
        const { position, width, height } = shapeManagement.prepareShapeAddition(
          state.shapes,
          {
            width: shape.width,
            height: shape.height,
            aspectRatio: (shape as ImageShape).aspectRatio,
            position: shape.position
          }
        );

        return {
          ...shape,
          position,
          width,
          height,
        };
      });

      const updatedShapes = [...state.shapes, ...processedShapes];

      // Center on the last added shape
      if (processedShapes.length > 0) {
        const lastShape = processedShapes[processedShapes.length - 1];
        const centeringOffset = shapeManagement.calculateCenteringOffset(lastShape, state.zoom);
        set(state => ({ ...state, offset: centeringOffset }));
      }

      return {
        shapes: updatedShapes,
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          updatedShapes,
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
        selectedShapes: processedShapes.map((shape) => shape.id),
      };
    }),

  updateShape: (id: string, props: Partial<Shape>) =>
    set((state) => {
      const newShapes = state.shapes.map((shape) => {
        if (shape.id === id) {
          return { ...shape, ...props };
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

  updateShapes: (updates: { id: string; shape: Partial<Shape> }[]) =>
    set((state) => {
      const newShapes = state.shapes.map((shape) => {
        const update = updates.find((u) => u.id === shape.id);
        if (update) {
          return { ...shape, ...update.shape };
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

  deleteShape: (id: string) =>
    set((state) => {
      const shapeIndex = state.shapes.findIndex((shape) => shape.id === id);
      if (shapeIndex === -1) return state;

      const newShapes = [...state.shapes];
      newShapes.splice(shapeIndex, 1);

      return {
        shapes: newShapes,
        selectedShapes: state.selectedShapes.filter((shapeId) => shapeId !== id),
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          newShapes,
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
      };
    }),

  deleteShapes: (ids: string[]) =>
    set((state) => ({
      shapes: state.shapes.filter((shape) => !ids.includes(shape.id)),
      selectedShapes: state.selectedShapes.filter((id) => !ids.includes(id)),
      history: [
        ...state.history.slice(0, state.historyIndex + 1),
        state.shapes.filter((shape) => !ids.includes(shape.id)),
      ].slice(-MAX_HISTORY),
      historyIndex: state.historyIndex + 1,
    })),

  setSelectedShapes: (ids: string[]) => set({ selectedShapes: ids }),

  resetState: () =>
    set({
      shapes: [],
      selectedShapes: [],
      history: [[]],
      historyIndex: 0,
      zoom: 1,
      offset: { x: 0, y: 0 },
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex > 0) {
        return {
          shapes: state.history[state.historyIndex - 1],
          historyIndex: state.historyIndex - 1,
          selectedShapes: [],
        };
      }
      return state;
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        return {
          shapes: state.history[state.historyIndex + 1],
          historyIndex: state.historyIndex + 1,
          selectedShapes: [],
        };
      }
      return state;
    }),
}); 