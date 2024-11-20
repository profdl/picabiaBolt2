import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';
import { CanvasState, Position, Shape } from './types';
import workflowJson from './lib/workflow.json';
import multiControlWorkflow from './lib/multiControl_API.json';
import { ContextMenuState } from './types';
import { savePreprocessedImage } from './lib/supabase';

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
  preprocessingStates: {
    [shapeId: string]: {
      depth?: boolean;
      edge?: boolean;
      pose?: boolean;
    };
  };
  advancedSettings: {
    model: string;
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
  sendBackward: () => void;
  sendForward: () => void;
  sendToBack: () => void;
  sendToFront: () => void;
  duplicate: () => void;
  createGroup: (shapeIds: string[]) => void;
  ungroup: (groupId: string) => void;
  generatePreprocessedImage: (shapeId: string, processType: 'depth' | 'edge' | 'pose') => Promise<void>;

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
    steps: 35,
    guidanceScale: 4.5,
    scheduler: 'dpmpp_2m_sde',
    seed: -1,
    outputFormat: 'webp',
    outputQuality: 95,
    randomiseSeeds: true,
    negativePrompt: '',
    width: 832,
    height: 1216
  },
  brushSize: 30,
  brushOpacity: 1,
  brushTexture: 'basic',
  assetsRefreshTrigger: 0,
  preprocessingStates: {},

};



export const useStore = create<BoardState>((set, get) => ({
  ...initialState,
  contextMenu: null,
  setContextMenu: (menu) => set({ contextMenu: menu }),

  createGroup: (shapeIds: string[]) => {
    const { shapes } = get();
    const groupId = Math.random().toString(36).substr(2, 9);

    // Calculate group bounds
    const groupedShapes = shapes.filter(s => shapeIds.includes(s.id));
    const minX = Math.min(...groupedShapes.map(s => s.position.x));
    const minY = Math.min(...groupedShapes.map(s => s.position.y));
    const maxX = Math.max(...groupedShapes.map(s => s.position.x + s.width));
    const maxY = Math.max(...groupedShapes.map(s => s.position.y + s.height));

    // Create group shape
    const groupShape: Shape = {
      id: groupId,
      type: 'group',
      position: { x: minX, y: minY },
      width: maxX - minX,
      height: maxY - minY,
      color: 'transparent',
      rotation: 0,
      isUploading: false
    };

    // Update shapes with group info
    const updatedShapes = shapes.map(shape =>
      shapeIds.includes(shape.id) ? { ...shape, groupId } : shape
    );

    set({
      shapes: [...updatedShapes, groupShape],
      selectedShapes: [groupId]
    });
  },

  ungroup: (groupId: string) => {
    const { shapes } = get();
    const updatedShapes = shapes
      .filter(s => s.id !== groupId)
      .map(s => s.groupId === groupId ? { ...s, groupId: undefined } : s);

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

  // In the updateShape function within useStore
  updateShape: (id: string, updatedProps: Partial<Shape>) => {
    set(state => {
      // If we're updating a preview URL, clear its processing state
      if (updatedProps.depthPreviewUrl) {
        state.preprocessingStates[id] = { ...state.preprocessingStates[id], depth: false };
      }
      if (updatedProps.edgePreviewUrl) {
        state.preprocessingStates[id] = { ...state.preprocessingStates[id], edge: false };
      }
      if (updatedProps.posePreviewUrl) {
        state.preprocessingStates[id] = { ...state.preprocessingStates[id], pose: false };
      }

      const newShapes = state.shapes.map((shape) =>
        shape.id === id ? { ...shape, ...updatedProps } : shape
      );
      return {
        shapes: newShapes,
        preprocessingStates: state.preprocessingStates,
        history: [...state.history.slice(0, state.historyIndex + 1), newShapes].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
      };
    });
  }
  ,
  updateShapes: (updates: { id: string; shape: Partial<Shape> }[]) => {
    const { shapes, historyIndex, history } = get();

    // Find if we're updating a group
    const groupUpdate = updates.find(u => shapes.find(s => s.id === u.id)?.type === 'group');

    if (groupUpdate) {
      const groupShape = shapes.find(s => s.id === groupUpdate.id);
      if (groupShape && groupShape.type === 'group') {
        const newWidth = groupUpdate.shape.width || groupShape.width;
        const newHeight = groupUpdate.shape.height || groupShape.height;

        // Calculate scale factors
        const scaleX = newWidth / groupShape.width;
        const scaleY = newHeight / groupShape.height;

        // Get all shapes in this group
        const groupedShapes = shapes.filter(s => s.groupId === groupShape.id);

        // Add scaled updates for all shapes in group
        const groupedUpdates = groupedShapes.map(shape => ({
          id: shape.id,
          shape: {
            width: shape.width * scaleX,
            height: shape.height * scaleY,
            position: {
              x: groupShape.position.x + (shape.position.x - groupShape.position.x) * scaleX,
              y: groupShape.position.y + (shape.position.y - groupShape.position.y) * scaleY
            }
          }
        }));

        updates = [...updates, ...groupedUpdates];
      }
    }

    const newShapes = shapes.map((shape) => {
      const update = updates.find((u) => u.id === shape.id);
      return update ? { ...shape, ...update.shape } : shape;
    });

    set({
      shapes: newShapes,
      history: [...history.slice(0, historyIndex + 1), newShapes].slice(-MAX_HISTORY),
      historyIndex: historyIndex + 1,
    });
  }

  ,

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
    const workflow = JSON.parse(JSON.stringify(multiControlWorkflow));
    const state = get();
    const { shapes } = state;

    // 1. Authentication check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    // 2. Prompt validation
    const stickyWithPrompt = shapes.find(
      shape => shape.type === 'sticky' && shape.showPrompt && shape.content
    );
    if (!stickyWithPrompt?.content) {
      set({ error: 'No prompt selected. Please select a sticky note with a prompt.' });
      return;
    }

    // 3. Set UI states
    set({ isGenerating: true, error: null });
    set({ showGallery: true });

    try {
      // 4. Update all workflow settings
      workflow["3"].inputs.steps = state.advancedSettings.steps || 20;
      workflow["3"].inputs.cfg = state.advancedSettings.guidanceScale || 7.5;
      workflow["3"].inputs.sampler_name = state.advancedSettings.scheduler || 'euler';
      workflow["3"].inputs.seed = state.advancedSettings.seed || Math.floor(Math.random() * 32767);
      workflow["3"].inputs.model = ["4", 0];
      workflow["6"].inputs.text = stickyWithPrompt.content;

      // 5. Set model checkpoint
      const modelCheckpoints = {
        juggernautXL: "juggernautXL_juggernautX.safetensors",
        dreamshaper: "dreamshaper_8.safetensors",
        juggernautXL_v9: "Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors"
      };
      const selectedModel = state.advancedSettings.model || 'juggernautXL_v9';
      workflow["4"].inputs.ckpt_name = modelCheckpoints[selectedModel as keyof typeof modelCheckpoints];

      // Find shape with control maps enabled
      const controlShape = shapes.find(shape =>
        shape.type === 'image' &&
        (shape.showDepth || shape.showEdges || shape.showPose)
      );

      let currentConditioningNode = "6";

      if (controlShape) {
        if (controlShape.showDepth && controlShape.depthPreviewUrl) {
          workflow["11"].inputs.conditioning = [currentConditioningNode, 0];
          workflow["13"].inputs.image = controlShape.depthPreviewUrl;
          currentConditioningNode = "11";
        }

        if (controlShape.showEdges && controlShape.edgePreviewUrl) {
          workflow["14"].inputs.conditioning = [currentConditioningNode, 0];
          workflow["16"].inputs.image = controlShape.edgePreviewUrl;
          currentConditioningNode = "14";
        }

        if (controlShape.showPose && controlShape.posePreviewUrl) {
          workflow["17"].inputs.conditioning = [currentConditioningNode, 0];
          workflow["19"].inputs.image = controlShape.posePreviewUrl;
          currentConditioningNode = "17";
        }


      }

      workflow["3"].inputs.positive = [currentConditioningNode, 0];

      const requestPayload = {
        workflow_json: workflow,
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

      const prediction_id = responseData.prediction.id;
      console.log('Extracted prediction_id:', prediction_id);

      const insertData = {
        id: crypto.randomUUID(),
        user_id: user.id,
        prompt: stickyWithPrompt.content,
        aspect_ratio: state.aspectRatio,
        created_at: new Date().toISOString(),
        prediction_id: responseData.prediction.id,
        status: 'generating',
        updated_at: new Date().toISOString(),
        image_index: 0,
        originalUrl: controlShape?.imageUrl?.replace(/^data:image\/[^;]+;base64,/, '') || '',
        depthMapUrl: controlShape?.showDepth ? controlShape.depthPreviewUrl?.replace(/^data:image\/[^;]+;base64,/, '') : '',
        edgeMapUrl: controlShape?.showEdges ? controlShape.edgePreviewUrl?.replace(/^data:image\/[^;]+;base64,/, '') : '',
        poseMapUrl: controlShape?.showPose ? controlShape.posePreviewUrl?.replace(/^data:image\/[^;]+;base64,/, '') : '',
        generated_01: '',
        generated_02: '',
        generated_03: '',
        generated_04: '',
        num_inference_steps: parseInt(state.advancedSettings.numInferenceSteps?.toString() || '35'),
        prompt_negative: state.advancedSettings.negativePrompt || '',
        width: parseInt('832'),
        height: parseInt('1216'),
        num_outputs: parseInt('1'),
        scheduler: state.advancedSettings.scheduler || 'dpmpp_2m_sde',
        guidance_scale: parseFloat(state.advancedSettings.guidanceScale?.toString() || '4.5'),
        prompt_strength: parseFloat('1.0'),
        seed: parseInt(state.advancedSettings.seed?.toString() || Math.floor(Math.random() * 32767).toString()),
        refine: '',
        refine_steps: parseInt('0'),
        lora_scale: parseFloat('1.0'),
        lora_weights: '',
        depth_scale: parseFloat(controlShape?.depthStrength?.toString() || '1.0'),
        edge_scale: parseFloat(controlShape?.edgesStrength?.toString() || '1.0'),
        pose_scale: parseFloat(controlShape?.poseStrength?.toString() || '1.0')
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

  ,
  sendBackward: () => {
    const { shapes, selectedShapes } = get();
    const newShapes = [...shapes];
    selectedShapes.forEach(id => {
      const index = newShapes.findIndex(s => s.id === id);
      if (index > 0) {
        [newShapes[index - 1], newShapes[index]] = [newShapes[index], newShapes[index - 1]];
      }
    });
    set({ shapes: newShapes });
  },

  sendForward: () => {
    const { shapes, selectedShapes } = get();
    const newShapes = [...shapes];
    [...selectedShapes].reverse().forEach(id => {
      const index = newShapes.findIndex(s => s.id === id);
      if (index < newShapes.length - 1) {
        [newShapes[index], newShapes[index + 1]] = [newShapes[index + 1], newShapes[index]];
      }
    });
    set({ shapes: newShapes });
  },

  sendToBack: () => {
    const { shapes, selectedShapes } = get();
    const selectedShapeObjects = shapes.filter(s => selectedShapes.includes(s.id));
    const otherShapes = shapes.filter(s => !selectedShapes.includes(s.id));
    set({ shapes: [...selectedShapeObjects, ...otherShapes] });
  },

  sendToFront: () => {
    const { shapes, selectedShapes } = get();
    const selectedShapeObjects = shapes.filter(s => selectedShapes.includes(s.id));
    const otherShapes = shapes.filter(s => !selectedShapes.includes(s.id));
    set({ shapes: [...otherShapes, ...selectedShapeObjects] });
  },

  duplicate: () => {
    const { shapes, selectedShapes, addShapes } = get();
    const shapesToDuplicate = shapes
      .filter(s => selectedShapes.includes(s.id))
      .map(shape => ({
        ...shape,
        id: Math.random().toString(36).substr(2, 9),
        position: {
          x: shape.position.x + 20,
          y: shape.position.y + 20
        }
      }));
    addShapes(shapesToDuplicate);
  },
  generatePreprocessedImage: async (shapeId: string, processType: 'depth' | 'edge' | 'pose') => {
    const { shapes } = get();
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape || !shape.imageUrl) return;

    // Set loading state
    set(state => ({
      preprocessingStates: {
        ...state.preprocessingStates,
        [shapeId]: {
          ...state.preprocessingStates[shapeId],
          [processType]: true
        }
      }
    }));

    try {
      await fetch('/.netlify/functions/preprocess-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: shape.imageUrl,
          processType,
          shapeId
        })
      });
    } catch (error) {
      console.error('Error preprocessing image:', error);
    }
  },

}));



