import { StateCreator } from "zustand";
import { Shape } from "../../types";
import { Position } from "../../types";

interface ClipboardState {
  clipboard: Shape[];
}

interface ClipboardSlice extends ClipboardState {
  copyShapes: (shapes: Shape[]) => void;
  cutShapes: (shapes: Shape[], remainingShapes: Shape[]) => void;
  pasteShapes: (offset?: Position) => Shape[];
  clearClipboard: () => void;
}

export const clipboardSlice: StateCreator<ClipboardSlice, [], [], ClipboardSlice> = (
  set,
  get
) => ({
  clipboard: [],

  copyShapes: (shapes: Shape[]) => {
    set({ clipboard: shapes });
  },

  cutShapes: (shapes: Shape[], remainingShapes: Shape[]) => {
    set({ clipboard: shapes });
    return remainingShapes;
  },

  pasteShapes: (offset = { x: 20, y: 20 }) => {
    const { clipboard } = get();
    if (clipboard.length === 0) return [];

    // Handle image shapes specifically
    const hasImageShapes = clipboard.some((shape) => shape.type === "image");
    if (hasImageShapes) {
      // Create new shapes preserving control states
      return clipboard.map((shape) => ({
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
    }

    // Handle sticky notes specifically
    const hasStickyNotes = clipboard.some((shape) => shape.type === "sticky");
    if (hasStickyNotes) {
      // Create new shapes with text prompt checked for sticky notes
      return clipboard.map((shape) => {
        const newShape = {
          ...shape,
          id: Math.random().toString(36).substr(2, 9),
          position: {
            x: shape.position.x + offset.x,
            y: shape.position.y + offset.y,
          },
        };
        
        if (shape.type === "sticky") {
          return {
            ...newShape,
            isTextPrompt: true,
            color: "var(--sticky-green)",
          };
        }
        
        return newShape;
      });
    }

    // Handle non-sticky note shapes
    return clipboard.map((shape) => ({
      ...shape,
      id: Math.random().toString(36).substr(2, 9),
      position: {
        x: shape.position.x + offset.x,
        y: shape.position.y + offset.y,
      },
    }));
  },

  clearClipboard: () => {
    set({ clipboard: [] });
  },
}); 