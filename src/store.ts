import { create } from 'zustand';
import { CanvasState, Position, Shape } from './types';

const MAX_HISTORY = 50;

const initialState: CanvasState = {
  shapes: [],
  selectedShapes: [] as string[],
  zoom: 1,
  offset: { x: 0, y: 0 },
  isDragging: false,
  tool: 'select',
  history: [[]],
  historyIndex: 0,
  gridEnabled: true,
  gridSize: 20,
  clipboard: [],
  currentColor: '#000000',
  strokeWidth: 2,
};

export const useStore = create<CanvasState>((set, get) => ({
  ...initialState,

  resetState: () => set(initialState),

  setShapes: (shapes: Shape[]) => {
    set({
      shapes,
      history: [...get().history.slice(0, get().historyIndex + 1), shapes].slice(-MAX_HISTORY),
      historyIndex: get().historyIndex + 1,
      selectedShapes: [],
    });
  },

  // Rest of the store implementation remains unchanged...
  addShape: (shape: Shape) => {
    const { shapes, historyIndex, history } = get();
    const newShapes = [...shapes, shape];
    set({
      shapes: newShapes,
      history: [...history.slice(0, historyIndex + 1), newShapes].slice(-MAX_HISTORY),
      historyIndex: historyIndex + 1,
    });
  },

  addShapes: (newShapes: Shape[]) => {
    const { shapes, historyIndex, history } = get();
    const updatedShapes = [...shapes, ...newShapes];
    set({
      shapes: updatedShapes,
      history: [...history.slice(0, historyIndex + 1), updatedShapes].slice(-MAX_HISTORY),
      historyIndex: historyIndex + 1,
    });
  },

  updateShape: (id: string, updatedProps: Partial<Shape>) => {
    const { shapes, historyIndex, history } = get();
    const newShapes = shapes.map((shape) =>
      shape.id === id ? { ...shape, ...updatedProps } : shape
    );
    set({
      shapes: newShapes,
      history: [...history.slice(0, historyIndex + 1), newShapes].slice(-MAX_HISTORY),
      historyIndex: historyIndex + 1,
    });
  },

  updateShapes: (updates: { id: string; shape: Partial<Shape> }[]) => {
    const { shapes, historyIndex, history } = get();
    const newShapes = shapes.map((shape) => {
      const update = updates.find((u) => u.id === shape.id);
      return update ? { ...shape, ...update.shape } : shape;
    });
    set({
      shapes: newShapes,
      history: [...history.slice(0, historyIndex + 1), newShapes].slice(-MAX_HISTORY),
      historyIndex: historyIndex + 1,
    });
  },

  deleteShape: (id: string) => {
    const { shapes, historyIndex, history, selectedShapes } = get();
    const newShapes = shapes.filter((shape) => shape.id !== id);
    set({
      shapes: newShapes,
      selectedShapes: selectedShapes.filter((shapeId) => shapeId !== id),
      history: [...history.slice(0, historyIndex + 1), newShapes].slice(-MAX_HISTORY),
      historyIndex: historyIndex + 1,
    });
  },

  deleteShapes: (ids: string[]) => {
    const { shapes, historyIndex, history } = get();
    const newShapes = shapes.filter((shape) => !ids.includes(shape.id));
    set({
      shapes: newShapes,
      selectedShapes: [],
      history: [...history.slice(0, historyIndex + 1), newShapes].slice(-MAX_HISTORY),
      historyIndex: historyIndex + 1,
    });
  },

  setSelectedShapes: (ids: string[]) => set({ selectedShapes: ids }),
  setZoom: (zoom: number) => set({ zoom }),
  setOffset: (offset: Position) => set({ offset }),
  setIsDragging: (isDragging: boolean) => set({ isDragging }),
  setTool: (tool: 'select' | 'pan' | 'pen') => set({ tool }),
  setCurrentColor: (color: string) => set({ currentColor: color }),
  setStrokeWidth: (width: number) => set({ strokeWidth: width }),

  copyShapes: () => {
    const { shapes, selectedShapes } = get();
    const shapesToCopy = shapes.filter((shape) => selectedShapes.includes(shape.id));
    set({ clipboard: shapesToCopy });
  },

  cutShapes: () => {
    const { shapes, selectedShapes, historyIndex, history } = get();
    const shapesToCut = shapes.filter((shape) => selectedShapes.includes(shape.id));
    const remainingShapes = shapes.filter((shape) => !selectedShapes.includes(shape.id));
    set({
      shapes: remainingShapes,
      selectedShapes: [],
      clipboard: shapesToCut,
      history: [...history.slice(0, historyIndex + 1), remainingShapes].slice(-MAX_HISTORY),
      historyIndex: historyIndex + 1,
    });
  },

  pasteShapes: (offset: Position = { x: 20, y: 20 }) => {
    const { clipboard, shapes, historyIndex, history } = get();
    if (clipboard.length === 0) return;

    const newShapes = clipboard.map((shape) => ({
      ...shape,
      id: Math.random().toString(36).substr(2, 9),
      position: {
        x: shape.position.x + offset.x,
        y: shape.position.y + offset.y,
      },
    }));

    const updatedShapes = [...shapes, ...newShapes];
    set({
      shapes: updatedShapes,
      selectedShapes: newShapes.map((shape) => shape.id),
      history: [...history.slice(0, historyIndex + 1), updatedShapes].slice(-MAX_HISTORY),
      historyIndex: historyIndex + 1,
    });
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex > 0) {
      set({
        shapes: history[historyIndex - 1],
        historyIndex: historyIndex - 1,
        selectedShapes: [],
      });
    }
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < history.length - 1) {
      set({
        shapes: history[historyIndex + 1],
        historyIndex: historyIndex + 1,
        selectedShapes: [],
      });
    }
  },

  toggleGrid: () => set((state) => ({ gridEnabled: !state.gridEnabled })),
}));