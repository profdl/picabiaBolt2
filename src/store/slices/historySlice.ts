import { StateCreator } from 'zustand';
import { Shape } from '../../types';

interface HistoryState {
    shapes: Shape[];
    selectedShapes: string[];
    setShapes: (shapes: Shape[]) => void;
}

interface HistorySlice {
    history: Shape[][];
    historyIndex: number;
    undo: () => void;
    redo: () => void;
}

export const historySlice: StateCreator<
    HistoryState & HistorySlice,
    [],
    [],
    HistorySlice
> = (set, get) => ({
    history: [[]],
    historyIndex: 0,

    undo: () => {
        const { historyIndex, history } = get();
        if (historyIndex > 0) {
            set({
                shapes: history[historyIndex - 1],
                historyIndex: historyIndex - 1,
                selectedShapes: []
            });
        }
    },

    redo: () => {
        const { historyIndex, history } = get();
        if (historyIndex < history.length - 1) {
            set({
                shapes: history[historyIndex + 1],
                historyIndex: historyIndex + 1,
                selectedShapes: []
            });
        }
    }
});