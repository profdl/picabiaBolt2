import { StateCreator } from "zustand";
import { Position, Shape } from "../../types";
import { shapeManagement } from '../../utils/shapeManagement';
import {mergeImages} from '../../utils/mergeImagesShapes';
import { shapeLayout } from '../../utils/shapeLayout';


const MAX_HISTORY = 50;

interface ShapeState {
  shapes: Shape[];
  selectedShapes: string[];
  clipboard: Shape[];
  history: Shape[][];
  historyIndex: number;
  preprocessingStates: {
    [shapeId: string]: {
      depth?: boolean;
      edge?: boolean;
      pose?: boolean;
      sketch?: boolean;
      imagePrompt?: boolean;
    };
  };
  isEditingText: boolean;
}

interface ShapeSlice extends ShapeState {
  zoom: number;
  offset: Position;
  setShapes: (shapes: Shape[]) => void;
  addShape: (shape: Shape) => void;
  addShapes: (shapes: Shape[]) => void;
  updateShape: (id: string, props: Partial<Shape>) => void;
  updateShapes: (updates: { id: string; shape: Partial<Shape> }[]) => void;
  deleteShape: (id: string) => void;
  deleteShapes: (ids: string[]) => void;
  setSelectedShapes: (ids: string[]) => void;
  copyShapes: () => void;
  cutShapes: () => void;
  pasteShapes: (offset?: Position) => void;
  sendBackward: () => void;
  sendForward: () => void;
  sendToBack: () => void;
  sendToFront: () => void;
  duplicate: () => void;
  createGroup: (shapeIds: string[]) => void;
  ungroup: (groupId: string) => void;
  addToGroup: (shapeIds: string[], groupId: string) => void;
  removeFromGroup: (shapeIds: string[]) => void;
  mergeImages: (shapeIds: string[]) => Promise<void>; 
  resetState: () => void;
  undo: () => void;
  redo: () => void;
  setIsEditingText: (isEditing: boolean) => void;
  create3DDepth: (shape: Shape, position: { x: number; y: number }) => void;

}

export const shapeSlice: StateCreator<ShapeSlice, [], [], ShapeSlice> = (
  set,
  get
) => ({
  zoom: 1,
  offset: { x: 0, y: 0 },
  shapes: [],
  selectedShapes: [],
  clipboard: [],
  history: [[]],
  historyIndex: 0,
  preprocessingStates: {},
  isEditingText: false,
  setIsEditingText: (isEditingText: boolean) => set({ isEditingText }),
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
            aspectRatio: shape.aspectRatio,
            position: shape.position
          }
        );
  
        // Create new shape with standardized positioning and existing properties
        const newShape: Shape = {
          ...shape,
          position,
          width,
          height,
          depthStrength: shape.depthStrength ?? 0.25,
          edgesStrength: shape.edgesStrength ?? 0.25,
          contentStrength: shape.contentStrength ?? 0.25,
          poseStrength: shape.poseStrength ?? 0.25,
          sketchStrength: shape.sketchStrength ?? 0.25,
          imagePromptStrength: shape.imagePromptStrength ?? 0.25,
          isEditing: shape.type === "sticky",
          showDepth: shape.showDepth ?? false,
          showEdges: shape.showEdges ?? false,
          showPose: shape.showPose ?? false,
          showPrompt: shape.showPrompt ?? false,
          showNegativePrompt: shape.showNegativePrompt ?? false,
          aspectRatio: shape.aspectRatio,
        };
  
        // Special handling for sticky notes
        if (shape.type === "sticky") {
          newShape.content = shape.content || "Double-Click to Edit...";
          newShape.isNew = true;
        }
  
  
        // Calculate centering offset for the new shape
        const centeringOffset = shapeManagement.calculateCenteringOffset(newShape, state.zoom);
        const updatedShapes = [newShape, ...state.shapes];
  
  
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
          isEditingText: shape.type === "sticky",
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
              aspectRatio: shape.aspectRatio,
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

  updateShapes: (updates: { id: string; shape: Partial<Shape> }[]) =>
    set((state) => {
      const newShapes = state.shapes.map((shape) => {
        const update = updates.find((u) => u.id === shape.id);
        if (update) {
          return {
            ...shape,
            ...update.shape,
            showDepth: update.shape.showDepth ?? shape.showDepth ?? false,
            showEdges: update.shape.showEdges ?? shape.showEdges ?? false,
            showPose: update.shape.showPose ?? shape.showPose ?? false,
            showSketch: update.shape.showSketch ?? shape.showSketch ?? false,
            showImagePrompt: update.shape.showImagePrompt ?? shape.showImagePrompt ?? false,
            showPrompt: update.shape.showPrompt ?? shape.showPrompt ?? false,
          };
        }
        return shape;
      });
      return { shapes: newShapes };
    }),

  deleteShape: (id) =>
    set((state) => {
      const shapeIndex = state.shapes.findIndex((shape) => shape.id === id);
      if (shapeIndex === -1) return state;

      const shapeToDelete = state.shapes[shapeIndex];
      const newShapes = [...state.shapes];
      newShapes.splice(shapeIndex, 1);

      if (shapeToDelete.type === "sticky") {
        if (shapeToDelete.showPrompt || shapeToDelete.showNegativePrompt) {
          newShapes.forEach((shape) => {
            if (shape.type === "sticky") {
              if (shape.showPrompt && shapeToDelete.showPrompt) {
                shape.showPrompt = false;
                shape.color = shape.showNegativePrompt ? "#ffcccb" : "#fff9c4";
              }
              if (
                shape.showNegativePrompt &&
                shapeToDelete.showNegativePrompt
              ) {
                shape.showNegativePrompt = false;
                shape.color = shape.showPrompt ? "#90EE90" : "#fff9c4";
              }
            }
          });
        }
      } else if (shapeToDelete.type === "image") {
        if (
          shapeToDelete.showDepth ||
          shapeToDelete.showEdges ||
          shapeToDelete.showPose ||
          shapeToDelete.showSketch
        ) {
          newShapes.forEach((shape) => {
            if (shape.type === "image") {
              if (shapeToDelete.showDepth) shape.showDepth = false;
              if (shapeToDelete.showEdges) shape.showEdges = false;
              if (shapeToDelete.showPose) shape.showPose = false;
              if (shapeToDelete.showSketch) shape.showSketch = false;
              if (shapeToDelete.showImagePrompt) shape.showImagePrompt = false;
            }
          });
        }
      }

      const newPreprocessingStates = { ...state.preprocessingStates };
      delete newPreprocessingStates[id];

      return {
        shapes: newShapes,
        selectedShapes: state.selectedShapes.filter(
          (shapeId) => shapeId !== id
        ),
        history: [...state.history.slice(0, state.historyIndex + 1), newShapes],
        historyIndex: state.historyIndex + 1,
        preprocessingStates: newPreprocessingStates,
      };
    }),

  deleteShapes: (ids) =>
    set((state) => ({
      shapes: state.shapes.filter((shape) => !ids.includes(shape.id)),
      selectedShapes: state.selectedShapes.filter((id) => !ids.includes(id)),
    })),

  setSelectedShapes: (ids) => set({ selectedShapes: ids }),

  copyShapes: () => {
    const { shapes, selectedShapes } = get();
    const shapesToCopy = shapes.filter((shape) =>
      selectedShapes.includes(shape.id)
    );
    set({ clipboard: shapesToCopy });
  },

  cutShapes: () => {
    const { shapes, selectedShapes, history, historyIndex } = get();
    const shapesToCut = shapes.filter((shape) =>
      selectedShapes.includes(shape.id)
    );
    const remainingShapes = shapes.filter(
      (shape) => !selectedShapes.includes(shape.id)
    );
    set({
      shapes: remainingShapes,
      selectedShapes: [],
      clipboard: shapesToCut,
      history: [...history.slice(0, historyIndex + 1), remainingShapes].slice(
        -MAX_HISTORY
      ),
      historyIndex: historyIndex + 1,
    });
  },

  pasteShapes: (offset = { x: 20, y: 20 }) => {
    const { clipboard, shapes, history, historyIndex } = get();
    if (clipboard.length === 0) return;

    // Handle image shapes specifically
    const hasImageShapes = clipboard.some((shape) => shape.type === "image");
    if (hasImageShapes) {
      // Get control states from clipboard images
      const controlStates = clipboard.reduce(
        (
          acc: {
            showDepth: boolean;
            showEdges: boolean;
            showPose: boolean;
            showSketch: boolean;
            showImagePrompt: boolean;
          },
          shape: Shape
        ) => {
          if (shape.type === "image") {
            return {
              showDepth: acc.showDepth || Boolean(shape.showDepth),
              showEdges: acc.showEdges || Boolean(shape.showEdges),
              showPose: acc.showPose || Boolean(shape.showPose),
              showSketch: acc.showSketch || Boolean(shape.showSketch),
              showImagePrompt: acc.showImagePrompt || Boolean(shape.showImagePrompt),
            };
          }
          return acc;
        },
        {
          showDepth: false,
          showEdges: false,
          showPose: false,
          showSketch: false,
          showImagePrompt: false,
        }
      );

      // Uncheck controls on existing image shapes
      const updatedOriginalShapes = shapes.map((shape) => {
        if (shape.type === "image") {
          return {
            ...shape,
            showDepth: controlStates.showDepth ? false : shape.showDepth,
            showEdges: controlStates.showEdges ? false : shape.showEdges,
            showPose: controlStates.showPose ? false : shape.showPose,
            showSketch: controlStates.showSketch ? false : shape.showSketch,
            showImagePrompt: controlStates.showImagePrompt ? false : shape.showImagePrompt,
          };
        }
        return shape;
      });

      // Create new shapes preserving control states
      const newShapes = clipboard.map((shape) => ({
        ...shape,
        id: Math.random().toString(36).substr(2, 9),
        position: {
          x: shape.position.x + offset.x,
          y: shape.position.y + offset.y,
        },
        // Preserve preview URLs and control states for image shapes
        depthPreviewUrl:
          shape.type === "image" ? shape.depthPreviewUrl : undefined,
        edgePreviewUrl:
          shape.type === "image" ? shape.edgePreviewUrl : undefined,
        posePreviewUrl:
          shape.type === "image" ? shape.posePreviewUrl : undefined,
        sketchPreviewUrl:
          shape.type === "image" ? shape.sketchPreviewUrl : undefined,
        imagePromptPreviewUrl:
          shape.type === "image" ? shape.imagePromptPreviewUrl : undefined,
      }));

      const updatedShapes = [...updatedOriginalShapes, ...newShapes];
      set({
        shapes: updatedShapes,
        selectedShapes: newShapes.map((shape) => shape.id),
        history: [...history.slice(0, historyIndex + 1), updatedShapes].slice(
          -MAX_HISTORY
        ),
        historyIndex: historyIndex + 1,
      });
      return;
    }

    // Handle sticky notes specifically
    const hasStickyNotes = clipboard.some((shape) => shape.type === "sticky");
    if (hasStickyNotes) {
      // Uncheck all existing sticky notes' text prompts
      const updatedOriginalShapes = shapes.map((shape) => {
        if (shape.type === "sticky") {
          return {
            ...shape,
            showPrompt: false,
            color: shape.showNegativePrompt ? "#ffcccb" : "#fff9c4",
          };
        }
        return shape;
      });

      // Create new shapes with text prompt checked for sticky notes
      const newShapes = clipboard.map((shape) => ({
        ...shape,
        id: Math.random().toString(36).substr(2, 9),
        position: {
          x: shape.position.x + offset.x,
          y: shape.position.y + offset.y,
        },
        showPrompt: shape.type === "sticky" ? true : shape.showPrompt,
        color: shape.type === "sticky" ? "#90EE90" : shape.color,
      }));

      const updatedShapes = [...updatedOriginalShapes, ...newShapes];
      set({
        shapes: updatedShapes,
        selectedShapes: newShapes.map((shape) => shape.id),
        history: [...history.slice(0, historyIndex + 1), updatedShapes].slice(
          -MAX_HISTORY
        ),
        historyIndex: historyIndex + 1,
      });
      return;
    }

    // Handle non-sticky note shapes as before
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
      history: [...history.slice(0, historyIndex + 1), updatedShapes].slice(
        -MAX_HISTORY
      ),
      historyIndex: historyIndex + 1,
    });
  },
  sendBackward: () =>
    set((state) => {
      const newShapes = [...state.shapes];
      const updates = [];

      for (let i = newShapes.length - 1; i > 0; i--) {
        if (state.selectedShapes.includes(newShapes[i].id)) {
          [newShapes[i - 1], newShapes[i]] = [newShapes[i], newShapes[i - 1]];
          updates.push(i - 1);
        }
      }

      if (updates.length === 0) return state;

      return {
        shapes: newShapes,
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          newShapes,
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
      };
    }),

  sendForward: () =>
    set((state) => {
      const newShapes = [...state.shapes];
      const updates = [];

      for (let i = 0; i < newShapes.length - 1; i++) {
        if (state.selectedShapes.includes(newShapes[i].id)) {
          [newShapes[i], newShapes[i + 1]] = [newShapes[i + 1], newShapes[i]];
          updates.push(i);
        }
      }

      if (updates.length === 0) return state;

      return {
        shapes: newShapes,
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          newShapes,
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
      };
    }),

  sendToBack: () =>
    set((state) => {
      const selectedShapeObjects = state.shapes.filter((s) =>
        state.selectedShapes.includes(s.id)
      );
      const otherShapes = state.shapes.filter(
        (s) => !state.selectedShapes.includes(s.id)
      );
      const newShapes = [...selectedShapeObjects, ...otherShapes];

      return {
        shapes: newShapes,
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          newShapes,
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
      };
    }),

  sendToFront: () =>
    set((state) => {
      const selectedShapeObjects = state.shapes.filter((s) =>
        state.selectedShapes.includes(s.id)
      );
      const otherShapes = state.shapes.filter(
        (s) => !state.selectedShapes.includes(s.id)
      );
      const newShapes = [...otherShapes, ...selectedShapeObjects];

      return {
        shapes: newShapes,
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          newShapes,
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
      };
    }),

  duplicate: () => {
    const { shapes, selectedShapes, addShapes } = get();
    const shapesToDuplicate = shapes
      .filter((s) => selectedShapes.includes(s.id))
      .map((shape) => ({
        ...shape,
        id: Math.random().toString(36).substr(2, 9),
        position: {
          x: shape.position.x + 20,
          y: shape.position.y + 20,
        },
      }));
    addShapes(shapesToDuplicate);
  },

  createGroup: (shapeIds) =>
    set((state) => {
      const groupId = Math.random().toString(36).substr(2, 9);
      const groupedShapes = state.shapes.filter((s) => shapeIds.includes(s.id));
      
      // Calculate bounds using layout utility
      const bounds = shapeLayout.calculateGroupBounds(groupedShapes);

      // Create the group shape
      const groupShape: Shape = {
        id: groupId,
        type: "group",
        position: { x: bounds.x, y: bounds.y },
        width: bounds.width,
        height: bounds.height,
        rotation: 0,
        color: "transparent",
        groupEnabled: true,
      };

      // Update shapes with new groupId
      const updatedShapes = state.shapes.map((shape) =>
        shapeIds.includes(shape.id) ? { ...shape, groupId } : shape
      );

      return {
        shapes: [groupShape, ...updatedShapes.filter(s => s.id !== groupId)],
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          [groupShape, ...updatedShapes.filter(s => s.id !== groupId)],
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
      };
    }),

  ungroup: (groupId) =>
    set((state) => {
      const updatedShapes = state.shapes
        .filter((s) => s.id !== groupId)
        .map((s) => (s.groupId === groupId ? { ...s, groupId: undefined } : s));

      return {
        shapes: updatedShapes,
        selectedShapes: state.shapes
          .filter((s) => s.groupId === groupId)
          .map((s) => s.id),
      };
    }),

  resetState: () =>
    set({
      shapes: [],
      selectedShapes: [],
      clipboard: [],
      history: [[]],
      historyIndex: 0,
      preprocessingStates: {},
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
  create3DDepth: (sourceShape: Shape) =>
    set((state) => {
      if (!sourceShape.depthPreviewUrl) return state;

      const newShape: Shape = {
        id: Math.random().toString(36).substr(2, 9),
        type: "3d",
        width: sourceShape.width,
        height: sourceShape.height,
        position: {
          x: sourceShape.position.x + sourceShape.width + 20,
          y: sourceShape.position.y,
        },
        rotation: 0,
        model: "",
        useSettings: false,
        isUploading: false,
        isEditing: false,
        color: "#ffffff",
        isOrbiting: false, 
        imageUrl: sourceShape.imageUrl,
        depthMap: sourceShape.depthPreviewUrl,
        displacementScale: 0.5,
        orbitControls: {
          autoRotate: false,
          autoRotateSpeed: 2.0,
          enableZoom: true,
          enablePan: true,
        },
        lighting: {
          intensity: 1,
          position: { x: 0, y: 1 },
          color: "#ffffff",
        },
        camera: {
          position: { x: 0, y: 0, z: 2 },
          fov: 75,
        },
        depthStrength: 0.75,
        edgesStrength: 0.75,
        contentStrength: 0.75,
        poseStrength: 0.75,
        sketchStrength: 0.75,
        imagePromptStrength: 0.75,
        showDepth: false,
        showEdges: false,
        showPose: false,
      };

      return {
        shapes: [newShape, ...state.shapes],
        selectedShapes: [newShape.id],
      };
    }),

  updateShape: (id: string, props: Partial<Shape>) =>
    set((state) => {
      const newShapes = state.shapes.map((shape) => {
        if (shape.id === id) {
          const updatedShape = { ...shape, ...props };

          // If this shape is in a group, update the group's dimensions
          if (shape.groupId) {
            const groupShape = state.shapes.find((s) => s.id === shape.groupId);
            if (groupShape) {
              const groupedShapes = state.shapes.filter((s) => s.groupId === shape.groupId);
              const bounds = shapeLayout.calculateGroupBounds(groupedShapes);
              
              // Update the group shape with new dimensions
              const updatedGroupShape = {
                ...groupShape,
                position: { x: bounds.x, y: bounds.y },
                width: bounds.width,
                height: bounds.height,
              };

              // Update the group shape in the shapes array
              return updatedGroupShape;
            }
          }

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

  update3DSettings: (id: string, settings: Partial<Shape>) =>
    set((state) => ({
      shapes: state.shapes.map((shape) =>
        shape.id === id ? { ...shape, ...settings } : shape
      ),
    })),


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

  addToGroup: (shapeIds, groupId) =>
    set((state) => {
      const groupShape = state.shapes.find((s) => s.id === groupId);
      if (!groupShape || groupShape.type !== "group") return state;

      const shapesToAdd = state.shapes.filter((s) => shapeIds.includes(s.id));
      
      // Calculate new bounds including the added shapes
      const allGroupedShapes = [
        ...state.shapes.filter((s) => s.groupId === groupId),
        ...shapesToAdd,
      ];
      
      const bounds = shapeLayout.calculateGroupBounds(allGroupedShapes);

      // Update the group shape with new dimensions
      const updatedGroupShape = {
        ...groupShape,
        position: { x: bounds.x, y: bounds.y },
        width: bounds.width,
        height: bounds.height,
      };

      // Update shapes with new groupId
      const updatedShapes = state.shapes.map((shape) =>
        shapeIds.includes(shape.id) ? { ...shape, groupId } : shape
      );

      return {
        shapes: [updatedGroupShape, ...updatedShapes.filter(s => s.id !== groupId)],
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          [updatedGroupShape, ...updatedShapes.filter(s => s.id !== groupId)],
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
      };
    }),

  removeFromGroup: (shapeIds) =>
    set((state) => {
      const shapesToRemove = state.shapes.filter((s) => shapeIds.includes(s.id));
      const groupIds = [...new Set(shapesToRemove.map(s => s.groupId))].filter(Boolean);

      // Update shapes by removing their groupId
      const updatedShapes = state.shapes.map((shape) =>
        shapeIds.includes(shape.id) ? { ...shape, groupId: undefined } : shape
      );

      // Update group shapes if needed
      const updatedGroupShapes = groupIds.map(groupId => {
        const groupShape = state.shapes.find(s => s.id === groupId);
        if (!groupShape) return null;

        const remainingGroupedShapes = updatedShapes.filter(s => s.groupId === groupId);
        if (remainingGroupedShapes.length === 0) return null;

        const bounds = shapeLayout.calculateGroupBounds(remainingGroupedShapes);

        return {
          ...groupShape,
          position: { x: bounds.x, y: bounds.y },
          width: bounds.width,
          height: bounds.height,
        };
      }).filter((shape): shape is Shape => shape !== null);

      return {
        shapes: [...updatedGroupShapes, ...updatedShapes.filter(s => !groupIds.includes(s.id))],
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          [...updatedGroupShapes, ...updatedShapes.filter(s => !groupIds.includes(s.id))],
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
      };
    }),
});


