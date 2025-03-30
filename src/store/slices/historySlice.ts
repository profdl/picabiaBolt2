import { StateCreator } from "zustand";
import { Shape } from "../../types";

const MAX_HISTORY = 50;

interface HistoryState {
  history: Shape[][];
  historyIndex: number;
}

interface HistorySlice extends HistoryState {
  addToHistory: (shapes: Shape[]) => void;
  undo: () => Shape[] | null;
  redo: () => Shape[] | null;
  resetHistory: () => void;
}

export const historySlice: StateCreator<HistorySlice, [], [], HistorySlice> = (
  set,
  get
) => ({
  history: [[]],
  historyIndex: 0,

  addToHistory: (shapes: Shape[]) =>
    set((state) => ({
      history: [
        ...state.history.slice(0, state.historyIndex + 1),
        shapes,
      ].slice(-MAX_HISTORY),
      historyIndex: state.historyIndex + 1,
    })),

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      set({ historyIndex: historyIndex - 1 });
      return history[historyIndex - 1];
    }
    return null;
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({ historyIndex: historyIndex + 1 });
      return history[historyIndex + 1];
    }
    return null;
  },

  resetHistory: () =>
    set({
      history: [[]],
      historyIndex: 0,
    }),
}); 