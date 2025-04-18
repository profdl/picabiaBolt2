import { StateCreator } from "zustand";
import { Shape } from "../../types";

interface ToolState {
  tool: "select" | "pan" | "pen" | "brush" | "eraser" | "inpaint";
  setTool: (tool: "select" | "pan" | "pen" | "brush" | "eraser" | "inpaint") => void;
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
  tool: "select" | "pan" | "pen" | "brush" | "eraser" | "inpaint";
  currentColor: string;
  strokeWidth: number;
  brushSize: number;
  brushOpacity: number;
  brushTexture: string;
  brushSpacing: number;
  brushRotation: number;
  brushFollowPath: boolean;
  brushHardness: number;
  setTool: (tool: "select" | "pan" | "pen" | "brush" | "eraser" | "inpaint") => void;
  setCurrentColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setBrushSize: (size: number) => void;
  setBrushOpacity: (opacity: number) => void;
  setBrushTexture: (texture: string) => void;
  setBrushSpacing: (spacing: number) => void;
  setBrushRotation: (rotation: number) => void;
  setBrushFollowPath: (value: boolean) => void;
  setBrushHardness: (hardness: number) => void;
  inpaintRestoreMode: boolean;
  setInpaintRestoreMode: (value: boolean) => void;
  eraserRestoreMode: boolean;
  setEraserRestoreMode: (value: boolean) => void;
  unEraseMode: boolean;
  setUnEraseMode: (value: boolean) => void;
  maskMode: boolean;
  setMaskMode: (value: boolean) => void;
}

export const createToolSlice: StateCreator<ToolState> = (set) => ({
  tool: "select" as "select" | "pan" | "pen" | "brush" | "eraser" | "inpaint",
  setTool: (tool) => set({ tool }),
  shapes: [],
  addShape: (shape) => set((state) => ({ shapes: [...state.shapes, shape] })),
  currentColor: "#000000",
  brushTexture: "soft",
  brushSize: 20,
  brushOpacity: 1,
  brushRotation: 0,
  brushSpacing: 0.1,
  brushFollowPath: false,
  brushHardness: 0.5,
});

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
  brushTexture: "soft",
  brushSpacing: 0.2,
  brushRotation: 0,
  brushFollowPath: false,
  brushHardness: 1,
  inpaintRestoreMode: false,
  eraserRestoreMode: false,
  unEraseMode: false,
  maskMode: true,
  setTool: (tool) => set({ tool }),
  setCurrentColor: (color) => set({ currentColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setBrushSize: (size) => set({ brushSize: size }),
  setBrushOpacity: (opacity) => set({ brushOpacity: opacity }),
  setBrushTexture: (texture) => set({ brushTexture: texture }),
  setBrushSpacing: (spacing) => set({ brushSpacing: spacing }),
  setBrushRotation: (rotation) => set({ brushRotation: rotation }),
  setBrushFollowPath: (value) => set(() => ({ brushFollowPath: value })),
  setBrushHardness: (hardness) => set({ brushHardness: hardness }),
  setUnEraseMode: (value) => set((state) => {
    if (state.tool === "inpaint") {
      return { unEraseMode: value, inpaintRestoreMode: value };
    } else if (state.tool === "eraser") {
      return { unEraseMode: value, eraserRestoreMode: value };
    }
    return { unEraseMode: value };
  }),
  setInpaintRestoreMode: (value) => set({ inpaintRestoreMode: value, unEraseMode: value }),
  setEraserRestoreMode: (value) => set({ eraserRestoreMode: value }),
  setMaskMode: (value) => set({ maskMode: value }),
});
