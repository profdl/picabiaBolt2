import { useStore } from '../store';

interface UseToolbarShapesResult {
  handleAddShape: (type: 'rectangle' | 'circle' | 'text' | 'sticky' | 'image' | 'sketchpad' | 'diffusionSettings') => void;
  getViewportCenter: () => { x: number; y: number };
  showAssets: boolean;
  toggleAssets: () => void;
  shapes: unknown[]; 
}

export function useToolbarShapes(): UseToolbarShapesResult {
  const { 
    addShape, 
    setTool, 
    offset, 
    zoom, 
    updateShape,
    setSelectedShapes,
    setIsEditingText,
    showAssets,
    toggleAssets,
    shapes
  } = useStore();

  const getViewportCenter = () => {
    const rect = document.querySelector("#root")?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    return {
      x: (rect.width / 2 - offset.x) / zoom,
      y: (rect.height / 2 - offset.y) / zoom,
    };
  };

  const handleAddShape = (type: 'rectangle' | 'circle' | 'text' | 'sticky' | 'image' | 'sketchpad' | 'diffusionSettings') => {
    const center = getViewportCenter();
    if (type === "sketchpad") {
      addShape({
        id: Math.random().toString(36).substr(2, 9),
        type: "sketchpad",
        position: {
          x: center.x - 256,
          y: center.y - 256,
        },
        width: 512,
        height: 512,
        color: "#ffffff",
        rotation: 0,
        model: "",
        useSettings: false,
        isUploading: false,
        isEditing: false,
        showSketch: true,
        depthStrength: 0.25,
        edgesStrength: 0.25,
        contentStrength: 0.25,
        poseStrength: 0.25,
        sketchStrength: 0.25,
        remixStrength: 0.25,
      });
      setTool("select");
      return;
    }

    if (type === "image") {
      const url = window.prompt("Enter image URL:");
      if (!url) return;

      addShape({
        id: Math.random().toString(36).substr(2, 9),
        type,
        position: {
          x: center.x - 150,
          y: center.y - 100,
        },
        width: 300,
        height: 200,
        color: "transparent",
        imageUrl: url,
        rotation: 0,
        aspectRatio: 1.5,
        isUploading: false,
        useSettings: false,
        model: "",
        isEditing: false,
        depthStrength: 0,
        edgesStrength: 0,
        contentStrength: 0,
        poseStrength: 0,
        sketchStrength: 0,
        remixStrength: 0,
      });
      setTool("select");
      return;
    }
    if (type === "diffusionSettings") {
      shapes.forEach((shape) => {
        if (shape.type === "diffusionSettings") {
          updateShape(shape.id, { useSettings: false });
        }
      });
      addShape({
        id: Math.random().toString(36).substr(2, 9),
        type: "diffusionSettings",
        position: {
          x: center.x - 150,
          y: center.y - 300,
        },
        width: 250,
        height: 180,
        color: "#f3f4f6",
        rotation: 0,
        isUploading: false,
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
        isEditing: false,
        depthStrength: 0,
        edgesStrength: 0,
        contentStrength: 0,
        poseStrength: 0,
        sketchStrength: 0,
        remixStrength: 0,
      });

      return;
    }
    const size = type === "sticky" ? 180 : 40;
    if (type === "sticky") {
      // Get existing shapes and updateShape from the store
      const existingShapes = useStore.getState().shapes;
      const storeUpdateShape = useStore.getState().updateShape;

      // First, uncheck any existing sticky notes with showPrompt
      existingShapes.forEach((shape) => {
        if (shape.type === "sticky" && shape.showPrompt) {
          storeUpdateShape(shape.id, {
            showPrompt: false,
            color: shape.showNegativePrompt ? "#ffcccb" : "#fff9c4",
          });
        }
      });

      // Function to add a sticky note with a random prompt
      if (type === "sticky") {
        const shapeId = Math.random().toString(36).substr(2, 9);

        addShape({
          id: shapeId,
          type,
          position: {
            x: center.x - size / 2,
            y: center.y - size / 2,
          },
          width: size * 1.5,
          height: size,
          color: "#90EE90",
          content: "Double-Click to Edit...",
          fontSize: 16,
          rotation: 0,
          showPrompt: true,
          isUploading: false,
          useSettings: false,
          model: "",
          isNew: true,
          isEditing: true,
          depthStrength: 0,
          edgesStrength: 0,
          contentStrength: 0,
          poseStrength: 0,
          sketchStrength: 0,
          remixStrength: 0,
        });

        setTool("select");
        setSelectedShapes([shapeId]);
        setIsEditingText(true);
      }
    } else {
      // Handle other shape types as before
      addShape({
        id: Math.random().toString(36).substr(2, 9),
        type,
        position: {
          x: center.x - size / 2,
          y: center.y - size / 2,
        },
        width: size,
        height: size,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        content: type === "text" ? "Double click to edit" : undefined,
        fontSize: 16,
        rotation: 0,
        isUploading: false,
        model: "",
        useSettings: false,
        isEditing: false,
        depthStrength: 0,
        edgesStrength: 0,
        contentStrength: 0,
        poseStrength: 0,
        sketchStrength: 0,
        remixStrength: 0,
      });
    }
  }; return {
    handleAddShape,
    getViewportCenter,
    showAssets,
    toggleAssets,
    shapes
  };
}