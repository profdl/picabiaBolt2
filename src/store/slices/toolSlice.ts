import { StateCreator } from 'zustand'


interface ToolState {
    tool: 'select' | 'pan' | 'pen' | 'brush';
    currentColor: string;
    strokeWidth: number;
    brushSize: number;
    brushOpacity: number;
    brushTexture: string;
    isDragging: boolean;
    gridEnabled: boolean;
    gridSize: number;
    showShortcuts: boolean;
}

interface ToolActions {
    setTool: (tool: 'select' | 'pan' | 'pen' | 'brush') => void;
    setCurrentColor: (color: string) => void;
    setStrokeWidth: (width: number) => void;
    setBrushSize: (size: number) => void;
    setBrushOpacity: (opacity: number) => void;
    setBrushTexture: (texture: string) => void;
    setIsDragging: (isDragging: boolean) => void;
    toggleGrid: () => void;
    setShowShortcuts: (show: boolean) => void;
}


interface ToolSlice extends ToolState, ToolActions { }

export const createToolSlice: StateCreator<ToolSlice> = (set) => ({    // State
    tool: 'select',
    currentColor: '#000000',
    strokeWidth: 2,
    brushSize: 30,
    brushOpacity: 1,
    brushTexture: 'basic',
    isDragging: false,
    gridEnabled: true,
    gridSize: 20,
    showShortcuts: false,

    // Actions
    setTool: (tool: 'select' | 'pan' | 'pen' | 'brush') => set({ tool }),
    setCurrentColor: (color: string) => set({ currentColor: color }),
    setStrokeWidth: (width: number) => set({ strokeWidth: width }),
    setBrushSize: (size: number) => set({ brushSize: size }),
    setBrushOpacity: (opacity: number) => set({ brushOpacity: opacity }),
    setBrushTexture: (texture: string) => set({ brushTexture: texture }),
    setIsDragging: (isDragging: boolean) => set({ isDragging }),
    toggleGrid: () => set((state) => ({ gridEnabled: !state.gridEnabled })),
    setShowShortcuts: (show: boolean) => set({ showShortcuts: show }),
})
