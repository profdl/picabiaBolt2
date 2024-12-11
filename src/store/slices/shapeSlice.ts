import { StateCreator } from "zustand";
import { Position, Shape } from "../../types";

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
      scribble?: boolean;
      remix?: boolean;
    };
  };
  isEditingText: boolean;
}

interface ShapeSlice extends ShapeState {
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
  resetState: () => void;
  undo: () => void;
  redo: () => void;
  setIsEditingText: (isEditing: boolean) => void;
}

export const shapeSlice: StateCreator<ShapeSlice, [], [], ShapeSlice> = (
  set,
  get
) => ({
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
    set((state) => ({
      shapes: [
        {
          ...shape,
          depthStrength: 0.75,
          edgesStrength: 0.75,
          contentStrength: 0.75,
          poseStrength: 0.75,
          scribbleStrength: 0.75,
          remixStrength: 0.75,
          isEditing: shape.type === "sticky", // Set editing mode for sticky
        },
        ...state.shapes,
      ],
      history: [
        ...state.history.slice(0, state.historyIndex + 1),
        [...state.shapes, shape],
      ],
      historyIndex: state.historyIndex + 1,
      selectedShapes: [shape.id], // Ensure shape is selected
      isEditingText: shape.type === "sticky", // Set global editing state
    })),
  addShapes: (newShapes) =>
    set((state) => {
      const updatedShapes = [...state.shapes, ...newShapes];
      return {
        shapes: updatedShapes,
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          updatedShapes,
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
        selectedShapes: newShapes.map((shape) => shape.id),
      };
    }),

  updateShape: (id: string, props: Partial<Shape>) =>
    set((state) => {
      const newShapes = state.shapes.map((shape) => {
        if (shape.id === id) {
          return {
            ...shape,
            ...props,
            showDepth: "showDepth" in props ? props.showDepth : shape.showDepth,
            showEdges: "showEdges" in props ? props.showEdges : shape.showEdges,
            showPose: "showPose" in props ? props.showPose : shape.showPose,
            showScribble:
              "showScribble" in props ? props.showScribble : shape.showScribble,
            showRemix: "showRemix" in props ? props.showRemix : shape.showRemix,
            showPrompt:
              "showPrompt" in props ? props.showPrompt : shape.showPrompt,
          };
        }
        return shape;
      });
      return { shapes: newShapes };
    }),

  updateShapes: (updates: { id: string; shape: Partial<Shape> }[]) =>
    set((state) => {
      const newShapes = state.shapes.map((shape) => {
        const update = updates.find((u) => u.id === shape.id);
        if (update) {
          return {
            ...shape,
            ...update.shape,
            showDepth:
              "showDepth" in update.shape
                ? update.shape.showDepth
                : shape.showDepth,
            showEdges:
              "showEdges" in update.shape
                ? update.shape.showEdges
                : shape.showEdges,
            showPose:
              "showPose" in update.shape
                ? update.shape.showPose
                : shape.showPose,
            showScribble:
              "showScribble" in update.shape
                ? update.shape.showScribble
                : shape.showScribble,
            showRemix:
              "showRemix" in update.shape
                ? update.shape.showRemix
                : shape.showRemix,
            showPrompt:
              "showPrompt" in update.shape
                ? update.shape.showPrompt
                : shape.showPrompt,
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
          shapeToDelete.showScribble
        ) {
          newShapes.forEach((shape) => {
            if (shape.type === "image") {
              if (shapeToDelete.showDepth) shape.showDepth = false;
              if (shapeToDelete.showEdges) shape.showEdges = false;
              if (shapeToDelete.showPose) shape.showPose = false;
              if (shapeToDelete.showScribble) shape.showScribble = false;
              if (shapeToDelete.showRemix) shape.showRemix = false;
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

    const updatedOriginalShapes = shapes.map((shape) => {
      if (
        shape.type === "sticky" &&
        (shape.showPrompt || shape.showNegativePrompt)
      ) {
        return {
          ...shape,
          showPrompt: false,
          showNegativePrompt: false,
          color: "#fff9c4",
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

      const minX = Math.min(...groupedShapes.map((s) => s.position.x));
      const minY = Math.min(...groupedShapes.map((s) => s.position.y));
      const maxX = Math.max(
        ...groupedShapes.map((s) => s.position.x + s.width)
      );
      const maxY = Math.max(
        ...groupedShapes.map((s) => s.position.y + s.height)
      );

      const groupShape: Shape = {
        id: groupId,
        type: "group",
        position: { x: minX, y: minY },
        width: maxX - minX,
        height: maxY - minY,
        color: "transparent",
        rotation: 0,
        isUploading: false,
        model: "",
        useSettings: false,
        isEditing: false,
        depthStrength: 0.75,
        edgesStrength: 0.75,
        contentStrength: 0.75,
        poseStrength: 0.75,
        scribbleStrength: 0.75,
        remixStrength: 0.75,
      };

      const updatedShapes = state.shapes.map((shape) =>
        shapeIds.includes(shape.id) ? { ...shape, groupId } : shape
      );

      return {
        shapes: [groupShape, ...updatedShapes],
        selectedShapes: [groupId],
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
});
