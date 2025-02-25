import { StateCreator } from "zustand";
import { Shape } from "../../types";

interface ToolState {
  shapes: Shape[];
  addShape: (shape: Shape) => void;
  currentColor: string;
  brushTexture: string;
  brushSize: number;
  brushOpacity: number;
  brushRotation: number;
  brushSpacing: number;
  brushFollowPath: boolean;
  brushHardness: number;
}

interface ToolSlice {
  tool: "select" | "pan" | "pen" | "brush" | "eraser";
  currentColor: string;
  strokeWidth: number;
  brushSize: number;
  brushOpacity: number;
  brushTexture: string;
  brushSpacing: number;
  brushRotation: number;
  brushFollowPath: boolean;
  isEraser: boolean;
  brushHardness: number;
  setTool: (tool: "select" | "pan" | "pen" | "brush" | "eraser") => void;
  setCurrentColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setBrushSize: (size: number) => void;
  setBrushOpacity: (opacity: number) => void;
  setBrushTexture: (texture: string) => void;
  setBrushSpacing: (spacing: number) => void;
  setBrushRotation: (rotation: number) => void;
  setBrushFollowPath: (value: boolean) => void;
  setIsEraser: (isEraser: boolean) => void;
  setBrushHardness: (hardness: number) => void;
}

export const toolSlice: StateCreator<
  ToolState & ToolSlice,
  [],
  [],
  ToolSlice
> = (set) => ({
  tool: "select",
  currentColor: "#000000",
  strokeWidth: 2,
  brushSize: 30,
  brushOpacity: 1,
  brushTexture: "basic",
  brushSpacing: 0.2,
  brushRotation: 0,
  brushFollowPath: false,
  isEraser: false,
  brushHardness: 1,
  setTool: (tool) => set({ tool }),
  setCurrentColor: (color) => set({ currentColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setBrushSize: (size) => set({ brushSize: size }),
  setBrushOpacity: (opacity) => set({ brushOpacity: opacity }),
  setBrushTexture: (texture) => set({ brushTexture: texture }),
  setBrushSpacing: (spacing) => set({ brushSpacing: spacing }),
  setBrushRotation: (rotation) => set({ brushRotation: rotation }),
  setBrushFollowPath: (value) => set(() => ({ brushFollowPath: value })),
  setIsEraser: (isEraser) => set({ isEraser }),
  setBrushHardness: (hardness) => set({ brushHardness: hardness }),
});
