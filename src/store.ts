import { create } from 'zustand';
import { CanvasState, Position, Shape } from './types';
import { generateImage } from './lib/replicate';
import { saveGeneratedImage } from './lib/supabase';
import workflowJson from './lib/workflow.json';

interface BoardState extends CanvasState {
  shapes: Shape[];
  selectedShapes: string[];
  zoom: number;
  offset: Position;
  isDragging: boolean;
  tool: 'select' | 'pan' | 'pen' | 'brush';
  history: Shape[][];
  historyIndex: number;
  gridEnabled: boolean;
  gridSize: number;
  clipboard: Shape[];
  currentColor: string;
  strokeWidth: number;
  showImageGenerate: boolean;
  showUnsplash: boolean;
  showGallery: boolean;
  showShortcuts: boolean;
  isGenerating: boolean;
  aspectRatio: string;
  error: string | null;
  showAssets: boolean;
  brushSize: number;
  brushOpacity: number;
  brushTexture: string;


  advancedSettings: {
    negativePrompt: string;
    numInferenceSteps: number;
    guidanceScale: number;
    scheduler: string;
    seed: number;
    steps: number;

  };

  // Methods
  resetState: () => void;
  setShapes: (shapes: Shape[]) => void;
  addShape: (shape: Shape) => void;
  addShapes: (shapes: Shape[]) => void;
  updateShape: (id: string, props: Partial<Shape>) => void;
  updateShapes: (updates: { id: string; shape: Partial<Shape> }[]) => void;
  deleteShape: (id: string) => void;
  deleteShapes: (ids: string[]) => void;
  setSelectedShapes: (ids: string[]) => void;
  setZoom: (zoom: number) => void;
  setOffset: (offset: Position) => void;
  setIsDragging: (isDragging: boolean) => void;
  setTool: (tool: 'select' | 'pan' | 'pen' | 'brush') => void;
  setCurrentColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  copyShapes: () => void;
  cutShapes: () => void;
  pasteShapes: (offset?: Position) => void;
  undo: () => void;
  redo: () => void;
  toggleGrid: () => void;
  setShowShortcuts: (show: boolean) => void;
  toggleImageGenerate: () => void;
  toggleUnsplash: () => void;
  toggleAssets: () => void;
  toggleGallery: () => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setAspectRatio: (ratio: string) => void;
  setAdvancedSettings: (settings: Partial<BoardState['advancedSettings']>) => void;
  handleGenerate: () => Promise<void>;
  setError: (error: string | null) => void;
  setBrushSize: (size: number) => void;
  setBrushOpacity: (opacity: number) => void;
  getCanvasImage?: () => string | undefined;
  setBrushTexture: (texture: string) => void;

}

const MAX_HISTORY = 50;

const initialState: Omit<BoardState, keyof { resetState: never, setShapes: never }> = {
  shapes: [],
  selectedShapes: [],
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
  showImageGenerate: false,
  showUnsplash: false,
  showAssets: false,

  showGallery: false,
  showShortcuts: false,
  isGenerating: false,
  aspectRatio: '1:1',
  error: null,
  advancedSettings: {
    workflowJson: JSON.stringify(workflowJson),
    outputFormat: 'webp',
    outputQuality: 95,
    randomiseSeeds: true,
  },
  brushSize: 30,
  brushOpacity: 1,
  brushTexture: 'basic'
};

const getViewportCenter = (currentState: typeof initialState) => {
  const rect = document.querySelector('#root')?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };

  return {
    x: (rect.width / 2 - currentState.offset.x) / currentState.zoom,
    y: (rect.height / 2 - currentState.offset.y) / currentState.zoom
  };
};

export const useStore = create<BoardState>((set, get) => ({
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
  setBrushTexture: (texture: string) => set({ brushTexture: texture }),

  addShape: (shape: Shape) => {
    set(state => {
      const newShapes = [...state.shapes, shape];
      return {
        shapes: newShapes,
        tool: shape.type === 'drawing' ? state.tool : 'select',
        history: [...state.history.slice(0, state.historyIndex + 1), newShapes],
        historyIndex: state.historyIndex + 1
      };
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
  setTool: (tool: 'select' | 'pan' | 'pen' | 'brush') => set({ tool }),
  setCurrentColor: (color: string) => set({ currentColor: color }),
  setStrokeWidth: (width: number) => set({ strokeWidth: width }),
  setBrushSize: (size: number) => set({ brushSize: size }),
  setBrushOpacity: (opacity: number) => set({ brushOpacity: opacity }),
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
  setShowShortcuts: (show: boolean) => set({ showShortcuts: show }),
  toggleImageGenerate: () => set(state => ({ showImageGenerate: !state.showImageGenerate })),
  toggleUnsplash: () => set(state => ({ showUnsplash: !state.showUnsplash })),
  toggleGallery: () => set(state => ({ showGallery: !state.showGallery })),
  toggleAssets: () => set(state => ({ showAssets: !state.showAssets })),
  // New image generation related methods
  setIsGenerating: (isGenerating: boolean) => set({ isGenerating }),
  setAspectRatio: (ratio: string) => set({ aspectRatio: ratio }),
  setAdvancedSettings: (settings: Partial<BoardState['advancedSettings']>) =>
    set(state => ({
      advancedSettings: { ...state.advancedSettings, ...settings }
    })),

  setError: (error: string | null) => set({ error }),

  handleGenerate: async () => {
    const state = get();
    const { shapes, advancedSettings } = state;

    const stickyWithPrompt = shapes.find(
      shape => shape.type === 'sticky' && shape.showPrompt && shape.content
    );

    const imageWithPrompt = shapes.find(
      shape => (shape.type === 'image' || shape.type === 'canvas') && shape.showPrompt
    );

    if (!stickyWithPrompt?.content) {
      set({ error: 'No prompt selected. Please select a sticky note with a prompt.' });
      return;
    }

    const customWorkflow = JSON.parse(advancedSettings.workflowJson);
    customWorkflow["6"].inputs.text = stickyWithPrompt.content;

    // Get the image URL if available
    const inputFile = imageWithPrompt?.type === 'canvas'
      ? imageWithPrompt.getCanvasImage?.()
      : imageWithPrompt?.imageUrl;

    set({ isGenerating: true, error: null });

    try {
      const imageUrl = await generateImage(
        JSON.stringify(customWorkflow),
        inputFile || undefined,  // Send undefined instead of null
        advancedSettings.outputFormat,
        advancedSettings.outputQuality,
        advancedSettings.randomiseSeeds
      );

      if (!imageUrl) {
        throw new Error('Failed to generate image');
      }

      // Try to save the generated image
      try {
        await saveGeneratedImage(imageUrl, stickyWithPrompt.content, state.aspectRatio);
      } catch (error) {
        console.error('Error saving image:', error);
        // Continue even if saving fails - we can still show the image
      }

      // Calculate dimensions
      let width = 512;
      let height = 512;

      const [w, h] = state.aspectRatio.split(':').map(Number);
      if (w > h) {
        height = (512 * h) / w;
      } else if (h > w) {
        width = (512 * w) / h;
      }
      // Use current state for center calculation
      const center = getViewportCenter(state);

      state.addShape({
        id: Math.random().toString(36).substr(2, 9),
        type: 'image',
        position: {
          x: center.x - width / 2,
          y: center.y - height / 2,
        },
        width,
        height,
        color: 'transparent',
        imageUrl,
        rotation: 0,
        aspectRatio: width / height,
      });
      state.setTool('select');
    } catch (error) {
      console.error('Error generating image:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to generate image' });
    } finally {
      set({ isGenerating: false });
    }
  }
}));