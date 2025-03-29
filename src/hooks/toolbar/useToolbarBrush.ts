import { useStore } from "../../store";

type ToolType = 'select' | 'pan' | 'pen' | 'brush' | 'eraser' | 'inpaint';

interface BrushControls {
  currentColor: string;
  setCurrentColor: (color: string) => void;
  brushTexture: string;
  setBrushTexture: (texture: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  brushOpacity: number;
  setBrushOpacity: (opacity: number) => void;
  brushRotation: number;
  setBrushRotation: (rotation: number) => void;
  brushFollowPath: boolean;
  setBrushFollowPath: (follow: boolean) => void;
  brushSpacing: number;
  setBrushSpacing: (spacing: number) => void;
  brushHardness: number;                    
  setBrushHardness: (hardness: number) => void;  
  tool: ToolType;
  setTool: (tool: ToolType) => void;
}


export function useToolbarBrush(): BrushControls {
  const {
    currentColor,
    setCurrentColor,
    brushTexture,
    setBrushTexture,
    brushSize,
    setBrushSize,
    brushOpacity,
    setBrushOpacity,
    brushRotation,
    setBrushRotation,
    brushFollowPath,
    setBrushFollowPath,
    brushSpacing,
    setBrushSpacing,
    brushHardness,        
    setBrushHardness,    
    tool,
    setTool
  } = useStore();

  return {
    currentColor,
    setCurrentColor,
    brushTexture,
    setBrushTexture,
    brushSize,
    setBrushSize,
    brushOpacity,
    setBrushOpacity,
    brushRotation,
    setBrushRotation,
    brushFollowPath,
    setBrushFollowPath,
    brushSpacing,
    setBrushSpacing,
    brushHardness,       
    setBrushHardness,    
    tool,
    setTool
  };
}