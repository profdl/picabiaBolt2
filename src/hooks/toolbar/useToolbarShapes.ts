// src/hooks/useToolbarShapes.ts
import { useStore } from "../../store";
import { Shape } from "../../types";
import { useShapeAdder } from "../shapes/useShapeAdder";

interface UseToolbarShapesResult {
  handleAddShape: (type: 'text' | 'sticky' | 'image' | 'diffusionSettings' | 'drawing' | '3d' | 'group' | 'depth' | 'edges' | 'pose') => void;
  showAssets: boolean;
  toggleAssets: () => void;
  shapes: Shape[];
}

export function useToolbarShapes(): UseToolbarShapesResult {
  const { 
    setTool,
    updateShape,
    showAssets,
    toggleAssets,
    shapes
  } = useStore();

  const { addNewShape } = useShapeAdder();

  const handleAddShape = async (type: 'text' | 'sticky' | 'image' | 'diffusionSettings' | 'drawing' | '3d' | 'group' | 'depth' | 'edges' | 'pose') => {
    // Handle image URLs
    if (type === "image") {
      const url = window.prompt("Enter image URL:");
      if (!url) return;

      await addNewShape("image", {
        imageUrl: url,
        aspectRatio: 1.5,
      }, "", {
        defaultWidth: 300,
        setSelected: true
      });
      setTool("select");
      return;
    }

    // Handle diffusion settings
    if (type === "diffusionSettings") {
      // Uncheck other diffusion settings
      shapes.forEach((shape) => {
        if (shape.type === "diffusionSettings") {
          updateShape(shape.id, { useSettings: false });
        }
      });

      await addNewShape("diffusionSettings", {
        color: "#f3f4f6",
        useSettings: true,
        steps: 30,
        outputQuality: 100,
        guidanceScale: 4.5,
        outputWidth: 1360,
        outputHeight: 768,
        model: "juggernautXL_v9",
        scheduler: "dpmpp_2m_sde",
        outputFormat: "png",
        randomiseSeeds: true,
      }, "", {
        defaultWidth: 250,
        setSelected: true
      });
      return;
    }

    // Handle sticky notes
    if (type === "sticky") {
      // First, ensure we disable text prompts on all existing sticky notes
      shapes.forEach(sticky => {
        if (sticky.type === "sticky" && sticky.isTextPrompt) {
          updateShape(sticky.id, {
            isTextPrompt: false,
            color: sticky.isNegativePrompt ? "var(--sticky-red)" : "var(--sticky-yellow)"
          });
        }
      });
      
      // Create new sticky note with text prompt enabled by default
      await addNewShape("sticky", {
        content: "",
        color: "var(--sticky-green)", 
        isEditing: true,
        isTextPrompt: true,  // Enable text prompt by default
        textPromptStrength: 4.5,
        width: 220,
        height: 180
      }, "", {
        defaultWidth: 220,
        setSelected: true,
        startEditing: true,
      });

      setTool("select");
      return;
    }

    // Handle other shape types
    await addNewShape(type, {
      color: "#" + Math.floor(Math.random() * 16777215).toString(16),
    }, "", {
      defaultWidth: 40,
      setSelected: true
    });
  };

  return {
    handleAddShape,
    showAssets,
    toggleAssets,
    shapes
  };
}