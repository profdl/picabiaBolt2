import { StateCreator } from "zustand";
import { Position, Shape } from "../../types";
import { ImageShape, StickyNoteShape, GroupShape } from "../../types/shapes";
import { shapeManagement } from '../../utils/shapeManagement';
import {mergeImages} from '../../utils/mergeImagesShapes';
import { shapeLayout } from '../../utils/shapeLayout';
import { nanoid } from 'nanoid';


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
  toggleGroupActive: (groupId: string) => void;
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
            aspectRatio: shape.type === "image" ? (shape as ImageShape).aspectRatio : undefined,
            position: shape.position
          }
        );

        // Create new shape with standardized positioning and existing properties
        const newShapeBase = {
          ...shape,
          position,
          width,
          height,
        };

        let newShape: Shape;

        // Apply type-specific properties based on shape type
        if (shape.type === "image") {
          const imageShape = shape as ImageShape;
          newShape = {
            ...newShapeBase,
            depthStrength: imageShape.depthStrength ?? 0.25,
            edgesStrength: imageShape.edgesStrength ?? 0.25,
            contentStrength: imageShape.contentStrength ?? 0.25,
            poseStrength: imageShape.poseStrength ?? 0.25,
            sketchStrength: imageShape.sketchStrength ?? 0.25,
            imagePromptStrength: imageShape.imagePromptStrength ?? 0.25,
            showDepth: imageShape.showDepth ?? false,
            showEdges: imageShape.showEdges ?? false,
            showPose: imageShape.showPose ?? false,
            showSketch: imageShape.showSketch ?? false,
            showImagePrompt: imageShape.showImagePrompt ?? false,
            aspectRatio: imageShape.aspectRatio,
          } as ImageShape;
        } else if (shape.type === "sticky") {
          const stickyShape = shape as StickyNoteShape;
          newShape = {
            ...newShapeBase,
            isEditing: true,
            showPrompt: stickyShape.showPrompt ?? false,
            showNegativePrompt: stickyShape.showNegativePrompt ?? false,
            isTextPrompt: stickyShape.isTextPrompt ?? false,
            isNegativePrompt: stickyShape.isNegativePrompt ?? false,
            textPromptStrength: stickyShape.textPromptStrength ?? 4.5,
            content: stickyShape.content || "Double-Click to Edit...",
            isNew: true,
          } as StickyNoteShape;
        } else {
          newShape = newShapeBase;
        }
        
        // Special handling for sticky notes with text prompt
        let updatedShapes = [...state.shapes];
        
        // If this is a new sticky with isTextPrompt=true, disable all other sticky prompts
        if (shape.type === "sticky" && (shape as StickyNoteShape).isTextPrompt) {
          updatedShapes = state.shapes.map(existingShape => {
            if (existingShape.type === "sticky" && (existingShape as StickyNoteShape).isTextPrompt) {
              return {
                ...existingShape,
                isTextPrompt: false, 
                color: (existingShape as StickyNoteShape).isNegativePrompt ? "var(--sticky-red)" : "var(--sticky-yellow)"
              } as StickyNoteShape;
            }
            return existingShape;
          });
          
          // Make sure the new sticky has the right properties
          if (newShape.type === "sticky") {
            (newShape as StickyNoteShape).isTextPrompt = true;
            newShape.color = "var(--sticky-green)";
          }
        }
        
        // Add the shape to the beginning of the array
        updatedShapes = [newShape, ...updatedShapes];
        
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
              aspectRatio: shape.type === "image" ? (shape as ImageShape).aspectRatio : undefined,
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
          // Apply updates based on shape type to avoid type errors
          if (shape.type === "image") {
            const imageShape = shape as ImageShape;
            return {
              ...imageShape,
              ...update.shape,
              showDepth: "showDepth" in update.shape ? update.shape.showDepth : imageShape.showDepth ?? false,
              showEdges: "showEdges" in update.shape ? update.shape.showEdges : imageShape.showEdges ?? false,
              showPose: "showPose" in update.shape ? update.shape.showPose : imageShape.showPose ?? false,
              showSketch: "showSketch" in update.shape ? update.shape.showSketch : imageShape.showSketch ?? false,
              showImagePrompt: "showImagePrompt" in update.shape ? update.shape.showImagePrompt : imageShape.showImagePrompt ?? false,
            } as ImageShape;
          } else if (shape.type === "sticky") {
            const stickyShape = shape as StickyNoteShape;
            return {
              ...stickyShape,
              ...update.shape,
              showPrompt: "showPrompt" in update.shape ? update.shape.showPrompt : stickyShape.showPrompt ?? false,
              showNegativePrompt: "showNegativePrompt" in update.shape ? update.shape.showNegativePrompt : stickyShape.showNegativePrompt ?? false,
            } as StickyNoteShape;
          } else {
            return {
              ...shape,
              ...update.shape,
            } as Shape;
          }
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
    const { clipboard, shapes, setShapes, setSelectedShapes, addShapes } = get();
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
            makeVariations: boolean;
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
              makeVariations: acc.makeVariations || Boolean(shape.makeVariations),
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
          makeVariations: false,
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
            makeVariations: controlStates.makeVariations ? false : shape.makeVariations,
          };
        }
        return shape;
      });

      // Create new shapes with updated positions
      const newShapes = clipboard.map((shape) => ({
        ...shape,
        id: Math.random().toString(36).substr(2, 9),
        position: {
          x: shape.position.x + offset.x,
          y: shape.position.y + offset.y,
        },
      }));

      // Update the shapes array with both the updated original shapes and new shapes
      setShapes([...updatedOriginalShapes, ...newShapes]);
      setSelectedShapes(newShapes.map((s) => s.id));
    } else {
      // Handle non-image shapes
      const newShapes = clipboard.map((shape) => ({
        ...shape,
        id: Math.random().toString(36).substr(2, 9),
        position: {
          x: shape.position.x + offset.x,
          y: shape.position.y + offset.y,
        },
      }));

      addShapes(newShapes);
      setSelectedShapes(newShapes.map((s) => s.id));
    }
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

  duplicate: () =>
    set((state) => {
      const { shapes, selectedShapes, addShapes, setSelectedShapes, updateShape } = get();
      if (selectedShapes.length === 0) return state;

      const newShapes = selectedShapes.map((id) => {
        const shape = shapes.find((s) => s.id === id);
        if (!shape) return null;

        const newShape = {
          ...shape,
          id: nanoid(),
          position: {
            x: shape.position.x + 20,
            y: shape.position.y + 20,
          },
        };

        // If this is an image shape, disable makeVariations on all other image shapes
        if (newShape.type === "image") {
          shapes.forEach((otherShape) => {
            if (otherShape.type === "image" && otherShape.id !== newShape.id) {
              updateShape(otherShape.id, { makeVariations: false });
            }
          });
        }

        return newShape;
      }).filter((shape): shape is Shape => shape !== null);

      addShapes(newShapes);
      setSelectedShapes(newShapes.map((s) => s.id));
      return state;
    }),

  createGroup: (shapeIds) =>
    set((state) => {
      const groupId = Math.random().toString(36).substr(2, 9);
      const groupedShapes = state.shapes.filter((s) => shapeIds.includes(s.id));
      
      // Calculate bounds using layout utility
      const bounds = shapeLayout.calculateGroupBounds(groupedShapes as Shape[]);

      // Store initial toggle states for each shape
      const shapeToggleStates = groupedShapes.reduce((acc, shape) => {
        acc[shape.id] = {
          showDepth: shape.type === "depth" ? shape.showDepth : undefined,
          showEdges: shape.type === "edges" ? shape.showEdges : undefined,
          showPose: shape.type === "pose" ? shape.showPose : undefined,
          showImagePrompt: shape.type === "image" ? shape.showImagePrompt : undefined,
          makeVariations: shape.type === "image" ? shape.makeVariations : undefined,
          useSettings: shape.type === "diffusionSettings" ? shape.useSettings : undefined,
          isTextPrompt: shape.type === "sticky" ? shape.isTextPrompt : undefined,
          isNegativePrompt: shape.type === "sticky" ? shape.isNegativePrompt : undefined,
        };
        return acc;
      }, {} as GroupShape['shapeToggleStates']);

      // Create the group shape
      const groupShape = {
        id: groupId,
        type: "group",
        position: { x: bounds.x, y: bounds.y },
        width: bounds.width,
        height: bounds.height,
        rotation: 0,
        color: "transparent",
        isUploading: false,
        isEditing: false,
        model: "",
        useSettings: false,
        groupEnabled: true,
        isActive: true,
        shapeToggleStates,
      } as GroupShape;

      // Update shapes with new groupId
      const updatedShapes = state.shapes.map((shape) =>
        shapeIds.includes(shape.id) ? { ...shape, groupId } as Shape : shape
      );

      const resultShapes = [groupShape as Shape, ...updatedShapes.filter(s => s.id !== groupId)];

      return {
        shapes: resultShapes,
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          resultShapes,
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
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          updatedShapes,
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
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
      // Only proceed if this is an image shape with a depthPreviewUrl
      if (sourceShape.type !== "image" || !(sourceShape as ImageShape).depthPreviewUrl) {
        return state;
      }

      const imageShape = sourceShape as ImageShape;

      const newShape = {
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
        depthMap: imageShape.depthPreviewUrl,
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
      };

      return {
        shapes: [newShape as Shape, ...state.shapes],
        selectedShapes: [newShape.id],
      };
    }),

  updateShape: (id: string, props: Partial<Shape>) =>
    set((state) => {
      // Special case: Handle sticky note text prompt toggling
      if ('isTextPrompt' in props && props.isTextPrompt === true) {
        // Find the shape we're updating
        const targetShape = state.shapes.find(shape => shape.id === id);
        
        // Only process for sticky notes
        if (targetShape && targetShape.type === "sticky") {
          // First, disable isTextPrompt on all other sticky notes 
          const newShapes = state.shapes.map((shape) => {
            // Skip the shape we're currently updating
            if (shape.id === id) {
              return {
                ...shape,
                ...props,
                isNegativePrompt: false, // Can't be both text and negative prompt
                color: "var(--sticky-green)"  // Ensure correct color
              } as Shape;
            }
            
            // For all other sticky notes, disable text prompt
            if (shape.type === "sticky" && (shape as StickyNoteShape).isTextPrompt) {
              return {
                ...shape,
                isTextPrompt: false,
                color: (shape as StickyNoteShape).isNegativePrompt ? "var(--sticky-red)" : "var(--sticky-yellow)"
              } as Shape;
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
        }
      } else if ('isTextPrompt' in props && props.isTextPrompt === false) {
        // Special case: Handle sticky note negative prompt toggling
        if ('isNegativePrompt' in props && props.isNegativePrompt === true) {
          // Find the shape we're updating
          const targetShape = state.shapes.find(shape => shape.id === id);
          
          // Only process for sticky notes
          if (targetShape && targetShape.type === "sticky") {
            // First, disable isNegativePrompt on all other sticky notes 
            const newShapes = state.shapes.map((shape) => {
              // Skip the shape we're currently updating
              if (shape.id === id) {
                return {
                  ...shape,
                  ...props,
                  isTextPrompt: false, // Can't be both text and negative prompt
                  color: "var(--sticky-red)"  // Ensure correct color
                } as Shape;
              }
              
              // For all other sticky notes, disable negative prompt
              if (shape.type === "sticky" && (shape as StickyNoteShape).isNegativePrompt) {
                return {
                  ...shape,
                  isNegativePrompt: false,
                  color: (shape as StickyNoteShape).isTextPrompt ? "var(--sticky-green)" : "var(--sticky-yellow)"
                } as Shape;
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
          }
        }
      }
      
      // Normal case - just update the shape
      const newShapes = state.shapes.map((shape) => {
        if (shape.id === id) {
          return { ...shape, ...props } as Shape;
        }
        return shape;
      });

      // If the updated shape is part of a group, update the group's dimensions separately
      const updatedShape = newShapes.find(shape => shape.id === id);
      if (updatedShape && updatedShape.groupId) {
        const groupId = updatedShape.groupId;
        const groupedShapes = newShapes.filter(s => s.groupId === groupId);
        const groupShape = newShapes.find(s => s.id === groupId);
        
        if (groupShape && groupShape.type === "group") {
          const bounds = shapeLayout.calculateGroupBounds(groupedShapes as Shape[]);
          
          // Find the index of the group shape and update it
          const groupIndex = newShapes.findIndex(s => s.id === groupId);
          if (groupIndex !== -1) {
            newShapes[groupIndex] = {
              ...groupShape,
              position: { x: bounds.x, y: bounds.y },
              width: bounds.width,
              height: bounds.height,
            } as Shape;
          }
        }
      }

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
        shape.id === id ? { ...shape, ...settings } as Shape : shape
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
      
      const bounds = shapeLayout.calculateGroupBounds(allGroupedShapes as Shape[]);

      // Update the group shape with new dimensions
      const updatedGroupShape = {
        ...groupShape,
        position: { x: bounds.x, y: bounds.y },
        width: bounds.width,
        height: bounds.height,
      } as GroupShape;

      // Update shapes with new groupId
      const updatedShapes = state.shapes.map((shape) =>
        shapeIds.includes(shape.id) ? { ...shape, groupId } as Shape : shape
      );

      const resultShapes = [updatedGroupShape as Shape, ...updatedShapes.filter(s => s.id !== groupId)];

      return {
        shapes: resultShapes,
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          resultShapes,
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
      };
    }),

  removeFromGroup: (shapeIds) =>
    set((state) => {
      const shapesToRemove = state.shapes.filter((s) => shapeIds.includes(s.id));
      const groupIds = Array.from(
        new Set(
          shapesToRemove
            .map(s => s.groupId)
            .filter(Boolean)
        )
      ) as string[];

      // Update shapes by removing their groupId
      const updatedShapes = state.shapes.map((shape) =>
        shapeIds.includes(shape.id) ? { ...shape, groupId: undefined } as Shape : shape
      );

      // Update group shapes if needed
      const updatedGroupShapes = groupIds.map(groupId => {
        const groupShape = state.shapes.find(s => s.id === groupId);
        if (!groupShape) return null;

        const remainingGroupedShapes = updatedShapes.filter(s => s.groupId === groupId);
        
        // If no shapes remain in the group, don't include the group
        if (remainingGroupedShapes.length === 0) return null;

        // Otherwise, recalculate the group bounds based on remaining shapes
        const bounds = shapeLayout.calculateGroupBounds(remainingGroupedShapes as Shape[]);

        return {
          ...groupShape,
          position: { x: bounds.x, y: bounds.y },
          width: bounds.width,
          height: bounds.height,
        } as Shape;
      }).filter((shape): shape is Shape => shape !== null);

      // Combine the updated group shapes with the non-group shapes
      // Ensure we only include shapes that are not part of a deleted group
      const shapesToKeep = updatedShapes.filter(s => !groupIds.includes(s.id));
      const resultShapes = [...updatedGroupShapes, ...shapesToKeep];
      
      return {
        shapes: resultShapes,
        selectedShapes: shapeIds, // Select the shapes that were removed from their group
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          resultShapes,
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
      };
    }),

  toggleGroupActive: (groupId: string) =>
    set((state) => {
      const groupShape = state.shapes.find((s) => s.id === groupId) as GroupShape;
      if (!groupShape || groupShape.type !== "group") return state;

      const newActiveState = !groupShape.isActive;

      // Update the group's active state
      const updatedGroupShape = {
        ...groupShape,
        isActive: newActiveState,
      };

      // Update all shapes in the group
      const updatedShapes = state.shapes.map((shape) => {
        if (shape.groupId === groupId) {
          if (newActiveState) {
            // Restore previous toggle states
            const previousStates = groupShape.shapeToggleStates[shape.id] || {};
            return {
              ...shape,
              ...previousStates,
            };
          } else {
            // Store current toggle states and disable all toggles
            const currentStates = {
              showDepth: shape.type === "depth" ? shape.showDepth : undefined,
              showEdges: shape.type === "edges" ? shape.showEdges : undefined,
              showPose: shape.type === "pose" ? shape.showPose : undefined,
              showImagePrompt: shape.type === "image" ? shape.showImagePrompt : undefined,
              makeVariations: shape.type === "image" ? shape.makeVariations : undefined,
              useSettings: shape.type === "diffusionSettings" ? shape.useSettings : undefined,
              isTextPrompt: shape.type === "sticky" ? shape.isTextPrompt : undefined,
              isNegativePrompt: shape.type === "sticky" ? shape.isNegativePrompt : undefined,
            };

            // Update the group's shapeToggleStates
            updatedGroupShape.shapeToggleStates[shape.id] = currentStates;

            // Disable all toggles
            return {
              ...shape,
              showDepth: false,
              showEdges: false,
              showPose: false,
              showImagePrompt: false,
              makeVariations: false,
              useSettings: false,
              isTextPrompt: false,
              isNegativePrompt: false,
            };
          }
        }
        return shape;
      });

      // Replace the group shape with the updated version
      const resultShapes = [
        ...updatedShapes.filter((s) => s.id !== groupId),
        updatedGroupShape as Shape,
      ];

      return {
        shapes: resultShapes,
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          resultShapes,
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
      };
    }),
});


