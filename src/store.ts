import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';
import { CanvasState, Position, Shape } from './types';
import multiControlWorkflow from './lib/generateWorkflow.json';
import { ContextMenuState } from './types';


const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface WorkflowNode {
  inputs: Record<string, any>;
  class_type: string;
  _meta?: {
    title: string;
  };
}

interface Workflow {
  [key: string]: WorkflowNode;
}

interface BoardState extends CanvasState {
  centerOnShape(prediction_id: any): unknown;
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

      // Add the shape to the beginning of the array
      newShapes.unshift(shape);

      return {
        shapes: newShapes,
        tool: shape.type === 'drawing' ? state.tool : 'select',
        history: [...state.history.slice(0, state.historyIndex + 1), newShapes],
        historyIndex: state.historyIndex + 1
      };
    });
  }
  ,

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
      // Update preprocessing states first
      if (updatedProps.depthPreviewUrl || updatedProps.edgePreviewUrl ||
        updatedProps.posePreviewUrl || updatedProps.scribblePreviewUrl ||
        updatedProps.remixPreviewUrl) {
        state.preprocessingStates[id] = {
          ...state.preprocessingStates[id],
          depth: !updatedProps.depthPreviewUrl && state.preprocessingStates[id]?.depth,
          edge: !updatedProps.edgePreviewUrl && state.preprocessingStates[id]?.edge,
          pose: !updatedProps.posePreviewUrl && state.preprocessingStates[id]?.pose,
          scribble: !updatedProps.scribblePreviewUrl && state.preprocessingStates[id]?.scribble,
          remix: !updatedProps.remixPreviewUrl && state.preprocessingStates[id]?.remix
        };
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


  centerOnShape: (shapeId: string) => {
    const shape = get().shapes.find(s => s.id === shapeId);
    if (!shape) return;

    const targetX = -(shape.position.x + shape.width / 2) * get().zoom + window.innerWidth / 2;
    const targetY = -(shape.position.y + shape.height / 2) * get().zoom + window.innerHeight / 2;

    const startX = get().offset.x;
    const startY = get().offset.y;

    const animate = (progress: number) => {
      get().setOffset({
        x: startX + (targetX - startX) * progress,
        y: startY + (targetY - startY) * progress
      });
    };

    const duration = 500; // Animation duration in ms
    const start = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic function
      const eased = 1 - Math.pow(1 - progress, 3);

      animate(eased);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  },
  handleGenerate: async () => {
    let workflow = JSON.parse(JSON.stringify(multiControlWorkflow));
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

    const hasActiveControls = shapes.some(shape =>
      shape.type === 'image' && (
        shape.showDepth ||
        shape.showEdges ||
        shape.showPose ||
        shape.showScribble ||
        shape.showRemix
      )
    );

    const stickyWithPrompt = shapes.find(
      shape => shape.type === 'sticky' && shape.showPrompt && shape.content
    );

    if (!stickyWithPrompt?.content && !hasActiveControls) {
      set({ error: 'Please select either a text prompt or image controls.' });
      return;
    }

    // If no text prompt, use empty string
    const promptText = stickyWithPrompt?.content || '';
    workflow["6"].inputs.text = promptText;

    // Set UI states
    set({ isGenerating: true, error: null });

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
      workflow["6"].inputs.text = promptText;
      workflow["6"].inputs.clip = ["4", 1];

      const negativePrompt = shapes.find(
        shape => shape.type === 'sticky' && shape.showNegativePrompt && shape.content
      )?.content || "text, watermark";
      workflow["7"].inputs.text = negativePrompt;
      workflow["7"].inputs.clip = ["4", 1];

      // After setting up the base prompts but before the control shape loop
      // Set default connections if no controls are active
      workflow["3"].inputs.model = ["4", 0];  // Connect to base model
      workflow["3"].inputs.positive = ["6", 0];  // Connect to positive prompt
      workflow["3"].inputs.negative = ["7", 0];  // Connect to negative prompt

      // Start with base nodes that are always needed
      const baseWorkflow: Workflow = {
        "3": workflow["3"],
        "4": workflow["4"],
        "6": workflow["6"],
        "7": workflow["7"],
        "8": workflow["8"],   // VAE Decode
        "9": workflow["9"],   // Save Image
        "34": workflow["34"],
      };

      const currentWorkflow: Workflow = { ...baseWorkflow };
      let currentPositiveNode = "6";

      const controlShapes = shapes.filter(shape =>
        shape.type === 'image' &&
        (shape.showDepth || shape.showEdges || shape.showPose || shape.showScribble || shape.showRemix)
      );

      for (const controlShape of controlShapes) {
        if (controlShape.showEdges && controlShape.edgePreviewUrl) {
          currentWorkflow["12"] = { ...workflow["12"], inputs: { ...workflow["12"].inputs, image: controlShape.edgePreviewUrl } };
          currentWorkflow["18"] = workflow["18"];
          currentWorkflow["41"] = {
            ...workflow["41"],
            inputs: {
              ...workflow["41"].inputs,
              positive: [currentPositiveNode, 0],
              negative: ["7", 0],
              control_net: ["18", 0],
              strength: controlShape.edgesStrength || 0.5
            }
          };
          currentPositiveNode = "41";
        }

        if (controlShape.showDepth && controlShape.depthPreviewUrl) {
          currentWorkflow["33"] = { ...workflow["33"], inputs: { ...workflow["33"].inputs, image: controlShape.depthPreviewUrl } };
          currentWorkflow["32"] = workflow["32"];
          currentWorkflow["31"] = {
            ...workflow["31"],
            inputs: {
              ...workflow["31"].inputs,
              positive: [currentPositiveNode, 0],
              negative: ["7", 0],
              control_net: ["32", 0],
              strength: controlShape.depthStrength || 0.5
            }
          };
          currentPositiveNode = "31";
        }

        if (controlShape.showPose && controlShape.posePreviewUrl) {
          currentWorkflow["37"] = { ...workflow["37"], inputs: { ...workflow["37"].inputs, image: controlShape.posePreviewUrl } };
          currentWorkflow["36"] = workflow["36"];
          currentWorkflow["42"] = {
            ...workflow["42"],
            inputs: {
              ...workflow["42"].inputs,
              positive: [currentPositiveNode, 0],
              negative: ["7", 0],
              control_net: ["36", 0],
              strength: controlShape.poseStrength || 0.5
            }
          };
          currentPositiveNode = "42";
        }

        if (controlShape.showScribble && controlShape.imageUrl) {
          currentWorkflow["40"] = { ...workflow["40"], inputs: { ...workflow["40"].inputs, image: controlShape.imageUrl } };
          currentWorkflow["39"] = workflow["39"];
          currentWorkflow["43"] = {
            ...workflow["43"],
            inputs: {
              ...workflow["43"].inputs,
              positive: [currentPositiveNode, 0],
              negative: ["7", 0],
              control_net: ["39", 0],
              strength: controlShape.scribbleStrength || 0.5
            }
          };
          currentPositiveNode = "43";
        }

        // Handle Remix (IPAdapter) chain
        if (controlShape.showRemix && controlShape.imageUrl) {
          currentWorkflow["11"] = {
            inputs: {
              preset: "PLUS (high strength)",
              model: ["4", 0]
            },
            class_type: "IPAdapterUnifiedLoader"
          };

          currentWorkflow["17"] = {
            inputs: {
              image: controlShape.imageUrl,
              upload: "image"
            },
            class_type: "LoadImage"
          };

          currentWorkflow["14"] = {
            inputs: {
              weight: controlShape.remixStrength || 1,
              weight_type: "linear",
              combine_embeds: "concat",
              start_at: 0,
              end_at: 1,
              embeds_scaling: "V only",
              model: ["11", 0],
              ipadapter: ["11", 1],
              image: ["17", 0]
            },
            class_type: "IPAdapterAdvanced"
          };

          // Connect KSampler to the IP-Adapter model chain
          workflow["3"].inputs.model = ["14", 0];
        }


      }

      // Connect final nodes to KSampler
      workflow["3"].inputs.positive = [currentPositiveNode, 0];
      workflow["3"].inputs.negative = ["7", 0];


      const requestPayload = {
        workflow_json: currentWorkflow,
        outputFormat: activeSettings.outputFormat,
        outputQuality: activeSettings.outputQuality,
        randomiseSeeds: activeSettings.randomiseSeeds
      };

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

      // Add placeholder shape
      const { addShape } = get();

      const { zoom, offset } = get();

      const center = {
        x: (window.innerWidth / 2 - offset.x) / zoom,
        y: (window.innerHeight / 2 - offset.y) / zoom
      };
      let scaledWidth = 100;
      let scaledHeight = 100;

      const openPosition = findOpenSpace(shapes, scaledWidth, scaledHeight, center);

      const maxDimension = 400;
      const aspectRatio = (activeSettings.outputWidth || 1360) / (activeSettings.outputHeight || 768);

      if (aspectRatio > 1) {
        scaledWidth = maxDimension;
        scaledHeight = maxDimension / aspectRatio;
      } else {
        scaledHeight = maxDimension;
        scaledWidth = maxDimension * aspectRatio;
      }

      const placeholderShape = {
        id: prediction_id,
        type: 'image' as const,
        position: openPosition,
        width: scaledWidth,
        height: scaledHeight,
        isUploading: true,
        imageUrl: '',
        color: 'transparent',
        rotation: 0,
        model: '',
        useSettings: false,
        showDepth: false,
        showEdges: false,
        showPose: false,
        showScribble: false,
        showRemix: false,
        depthStrength: 0.5,
        edgesStrength: 0.5,
        poseStrength: 0.5,
        scribbleStrength: 0.5,
        remixStrength: 0.5
      };


      addShape(placeholderShape);
      set({ selectedShapes: [prediction_id] });
      get().centerOnShape(prediction_id);




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
              const { updateShape } = get();
              updateShape(prediction_id, {
                isUploading: false,
                imageUrl: payload.new.generated_01,
              });
              get().removeGeneratingPrediction(prediction_id);
              subscription.unsubscribe();
            }
          }
        )
        .subscribe();

      const insertData = {
        id: crypto.randomUUID(),
        user_id: user.id,
        prompt: promptText,
        aspect_ratio: state.aspectRatio,
        created_at: new Date().toISOString(),
        prediction_id: prediction_id,
        status: 'generating',
        updated_at: new Date().toISOString(),
        image_index: 0,
        originalUrl: controlShapes.map(shape => shape.imageUrl).filter(Boolean).join(','),
        depthMapUrl: controlShapes.filter(shape => shape.showDepth).map(shape => shape.depthPreviewUrl).filter(Boolean).join(','),
        edgeMapUrl: controlShapes.filter(shape => shape.showEdges).map(shape => shape.edgePreviewUrl).filter(Boolean).join(','),
        poseMapUrl: controlShapes.filter(shape => shape.showPose).map(shape => shape.posePreviewUrl).filter(Boolean).join(','),
        scribbleMapUrl: controlShapes.filter(shape => shape.showScribble).map(shape => shape.imageUrl).filter(Boolean).join(','),
        remixMapUrl: controlShapes.filter(shape => shape.showRemix).map(shape => shape.imageUrl).filter(Boolean).join(','),
        depth_scale: Math.max(...controlShapes.filter(shape => shape.showDepth).map(shape => shape.depthStrength || 0.5)),
        edge_scale: Math.max(...controlShapes.filter(shape => shape.showEdges).map(shape => shape.edgesStrength || 0.5)),
        pose_scale: Math.max(...controlShapes.filter(shape => shape.showPose).map(shape => shape.poseStrength || 0.5)),
        scribble_scale: Math.max(...controlShapes.filter(shape => shape.showScribble).map(shape => shape.scribbleStrength || 0.5)),
        remix_scale: Math.max(...controlShapes.filter(shape => shape.showRemix).map(shape => shape.remixStrength || 0.5)),
        generated_01: '',
        generated_02: '',
        generated_03: '',
        generated_04: '',
        num_inference_steps: activeSettings.steps,
        prompt_negative: negativePrompt,
        width: activeSettings.outputWidth || 1360,
        height: activeSettings.outputHeight || 768,
        num_outputs: 1,
        scheduler: activeSettings.scheduler,
        guidance_scale: activeSettings.guidanceScale,
        prompt_strength: 1.0,
        seed: activeSettings.seed,
        refine: '',
        refine_steps: 0,
        lora_scale: 1.0,
        lora_weights: '',
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
  },
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



const findOpenSpace = (
  shapes: Shape[],
  width: number,
  height: number,
  center: Position
): Position => {
  const GRID_SIZE = 50;
  const MAX_RADIUS = 1000;

  const isPositionClear = (x: number, y: number): boolean => {
    return !shapes.some(shape => {
      const shapeRight = shape.position.x + shape.width;
      const shapeBottom = shape.position.y + shape.height;
      return !(x + width < shape.position.x ||
        x > shapeRight ||
        y + height < shape.position.y ||
        y > shapeBottom);
    });
  };

  let radius = 0;
  while (radius < MAX_RADIUS) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius;

      if (isPositionClear(x, y)) {
        return { x, y };
      }
    }
    radius += GRID_SIZE;
  }

  return center;
};
