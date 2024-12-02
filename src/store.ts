import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';
import { CanvasState, Position, Shape } from './types';
import workflowJson from './lib/workflow.json';
import multiControlWorkflow from './lib/multiControl_API.json';
import { ContextMenuState } from './types';
import { getPublicImageUrl } from './lib/supabase';


const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);


interface BoardState extends CanvasState {
  generatingPredictions: Set<string>;
  isEditingText: boolean;
  isEraser: boolean;
  shapes: Shape[];
  selectedShapes: string[];
  zoom: number;
  offset: Position;
  isDragging: boolean;
  tool: 'select' | 'pan' | 'pen' | 'brush' | 'eraser';
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
      scribble?: boolean;
      remix?: boolean;
    };
  };
  brushRotation: number;
  brushSpacing: number;
  brushFollowPath: boolean,

  advancedSettings: {
    width: number;
    height: number;
    isHorizontal: boolean;
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
  addGeneratingPrediction: (id: string) => void;
  removeGeneratingPrediction: (id: string) => void;
  setIsEditingText: (isEditing: boolean) => void;
  setBrushFollowPath: (value: boolean) => void,
  setIsEraser: (isEraser: boolean) => void;
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
  setTool: (tool: 'select' | 'pan' | 'pen' | 'brush' | 'eraser') => void;
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
  generatePreprocessedImage: (shapeId: string, processType: 'depth' | 'edge' | 'pose' | 'scribble' | 'remix') => Promise<void>;
  setBrushSpacing: (spacing: number) => void;
  setBrushRotation: (rotation: number) => void;
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
    steps: 30,
    guidanceScale: 4.5,
    scheduler: 'dpmpp_2m_sde',
    seed: -1,
    outputFormat: 'png',
    outputQuality: 95,
    randomiseSeeds: true,
    negativePrompt: '',
    width: 1360,
    height: 768,
    isHorizontal: false,
    model: '',
    numInferenceSteps: 0
  },
  brushSize: 30,
  brushOpacity: 1,
  brushTexture: 'basic',
  assetsRefreshTrigger: 0,
  preprocessingStates: {},
  brushRotation: 0,
  brushSpacing: 0.2,
  brushFollowPath: false,

};



export const useStore = create<BoardState>((set, get) => ({
  ...initialState,
  contextMenu: null,
  brushFollowPath: false,
  setContextMenu: (menu) => set({ contextMenu: menu }),
  setBrushSpacing: (spacing: number) => set({ brushSpacing: spacing }),
  setBrushRotation: (rotation: number) => set({ brushRotation: rotation }),
  setBrushFollowPath: (value: boolean) => set((state) => ({ ...state, brushFollowPath: value })),
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
      isUploading: false,
      model: '',
      useSettings: false
    };

    // Update shapes with group info and insert group at beginning
    const updatedShapes = shapes.map(shape =>
      shapeIds.includes(shape.id) ? { ...shape, groupId } : shape
    );

    set({
      shapes: [groupShape, ...updatedShapes],
      selectedShapes: [groupId]
    });
  },
  generatingPredictions: new Set<string>(),
  addGeneratingPrediction: (id: string) => set(state => ({
    generatingPredictions: new Set([...state.generatingPredictions, id])
  })),
  removeGeneratingPrediction: (id: string) => set(state => {
    const newPredictions = new Set(state.generatingPredictions);
    newPredictions.delete(id);
    return { generatingPredictions: newPredictions };
  }),

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
      const newShapes = [...state.shapes];

      // If adding a diffusionSettings shape, uncheck all other diffusionSettings shapes
      if (shape.type === 'diffusionSettings') {
        newShapes.forEach(existingShape => {
          if (existingShape.type === 'diffusionSettings') {
            existingShape.useSettings = false;
          }
        });
        // Set the new shape's useSettings to true
        shape.useSettings = true;
      }

      // Add the shape only once
      newShapes.push(shape);

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
      if (updatedProps.scribblePreviewUrl) {
        state.preprocessingStates[id] = { ...state.preprocessingStates[id], scribble: false };
      }
      if (updatedProps.remixPreviewUrl) {
        state.preprocessingStates[id] = { ...state.preprocessingStates[id], remix: false };
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
    set((state) => {
      const shapeIndex = state.shapes.findIndex(shape => shape.id === id);
      if (shapeIndex === -1) return state; // Shape not found, return current state

      const shapeToDelete = state.shapes[shapeIndex];
      const newShapes = [...state.shapes];
      newShapes.splice(shapeIndex, 1); // Remove the shape at the found index

      // Handle cleanup of control states and related shape properties
      if (shapeToDelete.type === 'sticky') {
        if (shapeToDelete.showPrompt || shapeToDelete.showNegativePrompt) {
          newShapes.forEach(shape => {
            if (shape.type === 'sticky') {
              if (shape.showPrompt && shapeToDelete.showPrompt) {
                shape.showPrompt = false;
                shape.color = shape.showNegativePrompt ? '#ffcccb' : '#fff9c4';
              }
              if (shape.showNegativePrompt && shapeToDelete.showNegativePrompt) {
                shape.showNegativePrompt = false;
                shape.color = shape.showPrompt ? '#90EE90' : '#fff9c4';
              }
            }
          });
        }
      } else if (shapeToDelete.type === 'image') {
        if (shapeToDelete.showDepth || shapeToDelete.showEdges ||
          shapeToDelete.showPose || shapeToDelete.showScribble) {
          newShapes.forEach(shape => {
            if (shape.type === 'image') {
              if (shapeToDelete.showDepth) shape.showDepth = false;
              if (shapeToDelete.showEdges) shape.showEdges = false;
              if (shapeToDelete.showPose) shape.showPose = false;
              if (shapeToDelete.showScribble) shape.showScribble = false;
              if (shapeToDelete.showRemix) shape.showRemix = false;
            }
          });
        }
      } else if (shapeToDelete.type === 'diffusionSettings') {
        if (shapeToDelete.useSettings) {
          newShapes.forEach(shape => {
            if (shape.type === 'diffusionSettings') {
              shape.useSettings = false;
            }
          });
        }
      }

      const newPreprocessingStates = { ...state.preprocessingStates };
      delete newPreprocessingStates[id];

      return {
        shapes: newShapes,
        selectedShapes: state.selectedShapes.filter(shapeId => shapeId !== id),
        history: [...state.history.slice(0, state.historyIndex + 1), newShapes],
        historyIndex: state.historyIndex + 1,
        preprocessingStates: newPreprocessingStates
      };
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
  setTool: (tool: 'select' | 'pan' | 'pen' | 'brush' | 'eraser') => set({ tool }),
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

    // First, uncheck prompts on original sticky notes
    const updatedOriginalShapes = shapes.map(shape => {
      if (shape.type === 'sticky' && (shape.showPrompt || shape.showNegativePrompt)) {
        return {
          ...shape,
          showPrompt: false,
          showNegativePrompt: false,
          color: '#fff9c4' // Reset to default sticky color
        };
      }
      return shape;
    });

    const newShapes = clipboard.map((shape) => ({
      ...shape,
      id: Math.random().toString(36).substr(2, 9),
      position: {
        x: shape.position.x + offset.x,
        y: shape.position.y + offset.y,
      },
    }));

    const updatedShapes = [...updatedOriginalShapes, ...newShapes];
    set({
      shapes: updatedShapes,
      selectedShapes: newShapes.map((shape) => shape.id),
      history: [...history.slice(0, historyIndex + 1), updatedShapes].slice(-MAX_HISTORY),
      historyIndex: historyIndex + 1,
    });
  }
  ,

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
      advancedSettings: { ...state.advancedSettings, ...settings },
    })),

  setError: (error: string | null) => set({ error }),

  handleGenerate: async () => {
    const workflow = JSON.parse(JSON.stringify(multiControlWorkflow));
    const state = get();
    const { shapes } = state;

    // Get settings from active diffusionSettings shape
    const activeSettings = shapes.find(
      shape => shape.type === 'diffusionSettings' && shape.useSettings
    ) || {
      steps: 30,
      guidanceScale: 4.5,
      scheduler: 'dpmpp_2m_sde',
      seed: Math.floor(Math.random() * 32767),
      outputWidth: 1360,
      outputHeight: 768,
      model: 'juggernautXL_v9',
      outputFormat: 'png',
      outputQuality: 100,
      randomiseSeeds: true
    };

    // Validation checks
    if (!activeSettings) {
      set({ error: 'No settings selected. Please select a settings shape.' });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    const stickyWithPrompt = shapes.find(
      shape => shape.type === 'sticky' && shape.showPrompt && shape.content
    );
    if (!stickyWithPrompt?.content) {
      set({ error: 'No prompt selected. Please select a sticky note with a prompt.' });
      return;
    }


    // Set UI states
    set({ isGenerating: true, error: null });
    set({ showGallery: true });

    try {
      // Base workflow settings - Node 3 (KSampler)
      workflow["3"].inputs.steps = activeSettings.steps || 20;
      workflow["3"].inputs.cfg = activeSettings.guidanceScale || 7.5;
      workflow["3"].inputs.sampler_name = activeSettings.scheduler || 'dpmpp_2m_sde';
      workflow["3"].inputs.seed = activeSettings.randomiseSeeds ?
        Math.floor(Math.random() * 32767) :
        (activeSettings.seed || Math.floor(Math.random() * 32767));

      // Set dimensions - Node 34 (EmptyLatentImage)
      workflow["34"].inputs.width = activeSettings.outputWidth || 1344;
      workflow["34"].inputs.height = activeSettings.outputHeight || 768;

      // Set prompts - Nodes 6 & 7 (CLIPTextEncode)
      workflow["6"].inputs.text = stickyWithPrompt.content;
      workflow["6"].inputs.clip = ["4", 1];


      const negativePrompt = shapes.find(
        shape => shape.type === 'sticky' && shape.showNegativePrompt && shape.content
      )?.content || "text, watermark";
      workflow["7"].inputs.text = negativePrompt;
      workflow["7"].inputs.clip = ["4", 1];


      // Find image with active controls
      const controlShape = shapes.find(shape =>
        shape.type === 'image' &&
        (shape.showDepth || shape.showEdges || shape.showPose || shape.showScribble || shape.showRemix)
      );

      // Initialize paths
      let modelNode = "4";
      let currentNode = "6";

      if (controlShape) {
        // Edge control chain
        if (controlShape.showEdges && controlShape.edgePreviewUrl) {
          workflow["12"].inputs.image = controlShape.edgePreviewUrl;
          workflow["41"].inputs.positive = [currentNode, 0];
          workflow["41"].inputs.negative = ["7", 0];
          workflow["41"].inputs.control_net = ["18", 0];
          workflow["41"].inputs.strength = controlShape.edgesStrength || 0.5;
          currentNode = "41";
        }

        // Depth control chain
        if (controlShape.showDepth && controlShape.depthPreviewUrl) {
          workflow["33"].inputs.image = controlShape.depthPreviewUrl;
          workflow["31"].inputs.positive = [currentNode, 0];
          workflow["31"].inputs.negative = ["7", 0];
          workflow["31"].inputs.control_net = ["32", 0];
          workflow["31"].inputs.strength = controlShape.depthStrength || 0.5;
          currentNode = "31";
        }

        // Pose control chain
        if (controlShape.showPose && controlShape.posePreviewUrl) {
          workflow["37"].inputs.image = controlShape.posePreviewUrl;
          workflow["36"].inputs.positive = [currentNode, 0];
          workflow["36"].inputs.negative = ["7", 0];
          workflow["36"].inputs.strength = controlShape.poseStrength || 0.5;
          currentNode = "36";
        }

        // Scribble control chain
        if (controlShape.showScribble && controlShape.imageUrl) {
          workflow["40"].inputs.image = controlShape.imageUrl;
          workflow["39"].inputs.positive = [currentNode, 0];
          workflow["39"].inputs.negative = ["7", 0];
          workflow["39"].inputs.strength = controlShape.scribbleStrength || 0.5;
          currentNode = "39";
        }

        // Remix control chain
        if (controlShape.showRemix && controlShape.imageUrl) {
          workflow["17"].inputs.image = controlShape.imageUrl;
          workflow["14"].inputs.model = ["11", 0];
          workflow["14"].inputs.ipadapter = ["11", 1];
          workflow["14"].inputs.weight = controlShape.remixStrength || 1;
          modelNode = "14";
        }


      }

      // Connect final nodes to KSampler
      workflow["3"].inputs.model = [modelNode, 0];
      workflow["3"].inputs.positive = [currentNode, 0];
      workflow["3"].inputs.negative = ["7", 0];

      const requestPayload = {
        workflow_json: workflow,
        outputFormat: activeSettings.outputFormat,
        outputQuality: activeSettings.outputQuality,
        randomiseSeeds: activeSettings.randomiseSeeds
      };

      // Check slider values:
      console.log('Control strengths:', {
        depth: controlShape?.depthStrength,
        edge: controlShape?.edgesStrength,
        pose: controlShape?.poseStrength,
        scribble: controlShape?.scribbleStrength,
        remix: controlShape?.remixStrength
      });

      // Add response validation
      const response = await fetch('/.netlify/functions/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      // Check if response is ok before parsing
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      if (!responseText) {
        throw new Error('Empty response received from server');
      }

      const responseData = JSON.parse(responseText);

      const prediction_id = responseData.prediction.id;
      get().addGeneratingPrediction(prediction_id);

      const subscription = supabase
        .channel(`generation_${prediction_id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'generated_images',
            filter: `prediction_id=eq.${prediction_id}`,
          },
          (payload) => {
            if (payload.new.status === 'completed') {
              get().removeGeneratingPrediction(prediction_id);
              subscription.unsubscribe();
            }
          }
        )
        .subscribe();

      const insertData = {
        id: crypto.randomUUID(),
        user_id: user.id,
        prompt: stickyWithPrompt.content,
        aspect_ratio: state.aspectRatio,
        created_at: new Date().toISOString(),
        prediction_id: prediction_id,
        status: 'generating',
        updated_at: new Date().toISOString(),
        image_index: 0,
        originalUrl: controlShape?.imageUrl || '',
        depthMapUrl: controlShape?.showDepth ? controlShape.depthPreviewUrl : '',
        edgeMapUrl: controlShape?.showEdges ? controlShape.edgePreviewUrl : '',
        poseMapUrl: controlShape?.showPose ? controlShape.posePreviewUrl : '',
        scribbleMapUrl: controlShape?.showScribble ? controlShape.imageUrl : '',
        remixMapUrl: controlShape?.showRemix ? controlShape.imageUrl : '',

        generated_01: '',
        generated_02: '',
        generated_03: '',
        generated_04: '',
        num_inference_steps: activeSettings.steps,
        prompt_negative: negativePrompt,
        width: activeSettings.outputWidth,
        height: activeSettings.outputHeight,
        num_outputs: 1,
        scheduler: activeSettings.scheduler,
        guidance_scale: activeSettings.guidanceScale,
        prompt_strength: 1.0,
        seed: activeSettings.seed,
        refine: '',
        refine_steps: 0,
        lora_scale: 1.0,
        lora_weights: '',
        depth_scale: controlShape?.depthStrength || 1.0,
        edge_scale: controlShape?.edgesStrength || 1.0,
        pose_scale: controlShape?.poseStrength || 1.0,
        scribble_scale: controlShape?.scribbleStrength || 1.0,
        remix_scale: controlShape?.remixStrength || 1.0,
      };

      const { data: pendingImage, error: dbError } = await supabase
        .from('generated_images')
        .insert(insertData)
        .select()
        .single();

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
  generatePreprocessedImage: async (shapeId: string, processType: 'depth' | 'edge' | 'pose' | 'scribble' | 'remix') => {
    const { shapes } = get();
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape || !shape.imageUrl) return;

    const imageUrl = getPublicImageUrl(shape.imageUrl);

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
      console.error('Error generating image:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to generate image' });
    } finally {
      // 4. Only set isGenerating to false if there are no active predictions
      if (get().generatingPredictions.size === 0) {
        set({ isGenerating: false });
      }
    }
  }
}));


