import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';
import { CanvasState, Position, Shape } from './types';
import workflowJson from './lib/workflow.json';
import controlWorkflow from './lib/controlWorkflow.json';
import { ContextMenuState } from './types';

//test
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);


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
  galleryRefreshCounter: number;
  uploadingAssets: string[];
  assetsRefreshTrigger: number;

  advancedSettings: {
    randomiseSeeds: unknown;
    outputQuality: unknown;
    outputFormat: unknown;
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
  refreshGallery: () => void;
  addUploadingAsset: (id: string) => void;
  removeUploadingAsset: (id: string) => void;
  triggerAssetsRefresh: () => void;
  contextMenu: ContextMenuState | null;
  setContextMenu: (menu: ContextMenuState | null) => void;
}const MAX_HISTORY = 50;

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
  brushTexture: 'basic',
  assetsRefreshTrigger: 0
};



export const useStore = create<BoardState>((set, get) => ({
  ...initialState,
  contextMenu: null,
  setContextMenu: (menu) => set({ contextMenu: menu }),

  createGroup: (shapeIds: string[]) => {
    const groupId = Math.random().toString(36).substr(2, 9);
    const shapes = get().shapes;

    // Calculate group bounds
    const groupedShapes = shapes.filter(s => shapeIds.includes(s.id));
    const minX = Math.min(...groupedShapes.map(s => s.position.x));
    const minY = Math.min(...groupedShapes.map(s => s.position.y));
    const maxX = Math.max(...groupedShapes.map(s => s.position.x + s.width));
    const maxY = Math.max(...groupedShapes.map(s => s.position.y + s.height));

    // Create group shape
    const groupShape: Shape = {
      id: groupId,
      type: 'rectangle',
      isGroup: true,
      position: { x: minX, y: minY },
      width: maxX - minX,
      height: maxY - minY,
      color: 'transparent',
      rotation: 0,
      isUploading: false
    };

    // Update all shapes in the group
    const updatedShapes = shapes.map(shape =>
      shapeIds.includes(shape.id)
        ? { ...shape, groupId }
        : shape
    );

    set({
      shapes: [...updatedShapes, groupShape],
      selectedShapes: [groupId]
    });
  },

  ungroup: (groupId: string) => {
    const shapes = get().shapes;
    const updatedShapes = shapes
      .filter(s => s.id !== groupId) // Remove group shape
      .map(s => s.groupId === groupId
        ? { ...s, groupId: undefined }
        : s
      );

    set({
      shapes: updatedShapes,
      selectedShapes: shapes
        .filter(s => s.groupId === groupId)
        .map(s => s.id)
    });
  },


  resetState: () => set(initialState),

  triggerAssetsRefresh: () => set(state => ({
    ...state,
    assetsRefreshTrigger: state.assetsRefreshTrigger + 1
  })),

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
  setZoom: (newZoom: number, center?: Position) => {
    set(state => {
      if (!center) {
        return { zoom: newZoom };
      }

      // Calculate new offset to maintain zoom center
      const oldZoom = state.zoom;
      const scale = newZoom / oldZoom;

      const newOffset = {
        x: center.x - (center.x - state.offset.x) * scale,
        y: center.y - (center.y - state.offset.y) * scale
      };

      return {
        zoom: newZoom,
        offset: newOffset
      };
    });
  }

  , setOffset: (offset: Position) => set({ offset }),
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
    const { shapes } = state;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    // Find the active prompts
    const imageWithPrompt = shapes.find(
      shape => (shape.type === 'image' || shape.type === 'canvas') && shape.showPrompt
    );
    const stickyWithPrompt = shapes.find(
      shape => shape.type === 'sticky' && shape.showPrompt && shape.content
    );

    if (!stickyWithPrompt?.content) {
      set({ error: 'No prompt selected. Please select a sticky note with a prompt.' });
      return;
    }

    set({ isGenerating: true, error: null });
    set({ showGallery: true });
    try {
      // Clone the control workflow
      const workflow = JSON.parse(JSON.stringify(controlWorkflow));

      // Update the positive prompt in the workflow
      workflow["6"].inputs.text = stickyWithPrompt.content;

      // If there's an image prompt, update its URL
      if (imageWithPrompt?.imageUrl) {
        workflow["12"].inputs.image = imageWithPrompt.imageUrl;
      }

      const requestPayload = {
        workflow_json: workflow,
        imageUrl: imageWithPrompt?.imageUrl || null,
        outputFormat: state.advancedSettings.outputFormat,
        outputQuality: state.advancedSettings.outputQuality,
        randomiseSeeds: state.advancedSettings.randomiseSeeds
      };

      const response = await fetch('/.netlify/functions/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });
      const responseData = await response.json();
      console.log('Response from generate-image:', responseData);

      // Extract ID from the nested prediction object
      const prediction_id = responseData.prediction.id;
      console.log('Extracted prediction_id:', prediction_id);

      const insertData = {
        user_id: user.id,
        prompt: stickyWithPrompt.content,
        status: 'generating',
        prediction_id: responseData.prediction.id,
        image_url: '',
        aspect_ratio: state.aspectRatio,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };


      console.log('Data being inserted into Supabase:', insertData);

      const { data: pendingImage, error: dbError } = await supabase
        .from('generated_images')
        .insert(insertData)
        .select()
        .single();

      console.log('Supabase insert result:', { data: pendingImage, error: dbError });
    } catch (error) {
      console.error('Error generating image:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to generate image' });
    } finally {
      set({ isGenerating: false });
    }
  }

}));


