import { StateCreator } from "zustand";
import { Shape } from "../../types";

const MAX_HISTORY = 50;

interface StickyNoteState {
  isEditingText: boolean;
  shapes: Shape[];
  history: Shape[][];
  historyIndex: number;
}

interface StickyNoteSlice extends StickyNoteState {
  setIsEditingText: (isEditing: boolean) => void;
  updateStickyNote: (id: string, props: Partial<Shape>) => void;
}

interface StickyNoteSettings {
  isTextPrompt?: boolean;
  isNegativePrompt?: boolean;
  color?: string;
  content?: string;
}

export const stickyNoteSlice: StateCreator<StickyNoteSlice, [], [], StickyNoteSlice> = (
  set
) => ({
  isEditingText: false,
  shapes: [],
  history: [[]],
  historyIndex: 0,

  setIsEditingText: (isEditingText: boolean) => set({ isEditingText }),

  updateStickyNote: (id: string, props: Partial<Shape>) =>
    set((state) => {
      const stickySettings = props as StickyNoteSettings;
      
      // Special case: Handle sticky note text prompt toggling
      if (stickySettings.isTextPrompt === true) {
        console.log('Handling text prompt toggle to TRUE');
        
        // Find the shape we're updating
        const targetShape = state.shapes.find(shape => shape.id === id);
        console.log('Target shape found:', targetShape?.id, 'type:', targetShape?.type);
        
        // Only process for sticky notes
        if (targetShape && targetShape.type === "sticky") {
          console.log('Processing sticky note text prompt toggle');
          
          // Count how many sticky notes already have text prompts enabled
          const existingPromptStickies = state.shapes.filter(
            s => s.type === "sticky" && s.isTextPrompt && s.id !== id
          );
          console.log('Found', existingPromptStickies.length, 'other sticky notes with text prompt enabled');
          
          // First, disable isTextPrompt on all other sticky notes 
          const newShapes = state.shapes.map((shape) => {
            // Skip the shape we're currently updating
            if (shape.id === id) {
              console.log('Updating current sticky:', id);
              return {
                ...shape,
                ...props,
                isNegativePrompt: false, // Can't be both text and negative prompt
                color: "var(--sticky-green)"  // Ensure correct color
              } as Shape;
            }
            
            // For all other sticky notes, disable text prompt
            if (shape.type === "sticky" && shape.isTextPrompt) {
              console.log('Disabling text prompt on other sticky:', shape.id);
              return {
                ...shape,
                isTextPrompt: false,
                color: shape.isNegativePrompt ? "var(--sticky-red)" : "var(--sticky-yellow)"
              } as Shape;
            }
            
            return shape;
          });
          
          console.log('Returning updated state with text prompt toggles applied');
          return {
            shapes: newShapes,
            history: [
              ...state.history.slice(0, state.historyIndex + 1),
              newShapes,
            ].slice(-MAX_HISTORY),
            historyIndex: state.historyIndex + 1,
          };
        } else {
          console.log('Target shape not found or not a sticky note');
        }
      } else if (stickySettings.isTextPrompt === false) {
        console.log('Handling text prompt toggle to FALSE');
      }
      
      // Special case: Handle sticky note negative prompt toggling
      if (stickySettings.isNegativePrompt === true) {
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
            if (shape.type === "sticky" && shape.isNegativePrompt) {
              return {
                ...shape,
                isNegativePrompt: false,
                color: shape.isTextPrompt ? "var(--sticky-green)" : "var(--sticky-yellow)"
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
      
      // Normal case - just update the shape
      const newShapes = state.shapes.map((shape) => {
        if (shape.id === id) {
          return { ...shape, ...props } as Shape;
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
}); 