import {
  StickyNote,
  Hand,
  MousePointer,
  Sparkles,
  Settings,
  Image as ImageIcon,
  Loader2,
  Grid,
  BookImageIcon,
} from "lucide-react";
import { useStore } from "../../../store";
import { useMemo } from "react";
import { useEffect } from "react";
import { Tooltip } from "../../shared/Tooltip";
import { UploadButton } from "../../shared/UploadButton";
import { BrushShapeSelector } from "./BrushShapeSelector";
import { ToolbarButton } from "../../shared/ToolbarButton";



interface ToolbarProps {
  onShowImageGenerate: () => void;
  onShowUnsplash: () => void;
  onShowGallery: () => void;
  showImageGenerate?: boolean;
  showUnsplash?: boolean;
  showGallery?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ showGallery }) => {
  useStore((state) => ({
    showAssets: state.showAssets,
    toggleAssets: state.toggleAssets,
  }));
  const { setCurrentColor } = useStore();

  const {
    zoom,
    addShape,
    tool,
    setTool,
    offset,
    toggleGallery,
    handleGenerate,
    shapes,
    generatingPredictions,
    setSelectedShapes,
    setIsEditingText,
    updateShape,
    currentColor,
    brushTexture,
    setBrushTexture,
    setBrushSize,
    brushSize,
    setBrushOpacity,
    brushOpacity,
    setBrushRotation,
    brushRotation,
    brushFollowPath,
    setBrushSpacing,
    brushSpacing,
    showAssets, 
    toggleAssets 
  } = useStore();

  const hasActivePrompt = useMemo(
    () =>
      shapes.some(
        (shape) =>
          (shape.type === "sticky" && shape.showPrompt && shape.content) ||
          (shape.type === "image" &&
            (shape.showDepth ||
              shape.showEdges ||
              shape.showPose ||
              shape.showSketch ||
              shape.showRemix))
      ),
    [shapes]
  );

  const getViewportCenter = () => {
    const rect = document.querySelector("#root")?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    return {
      x: (rect.width / 2 - offset.x) / zoom,
      y: (rect.height / 2 - offset.y) / zoom,
    };
  };

  useEffect(() => {
    if (tool === "brush") {
      setCurrentColor("#ffffff");
    }
  }, [setCurrentColor, tool]);




  const handleAddShape = (
    type:
      | "rectangle"
      | "circle"
      | "text"
      | "sticky"
      | "image"
      | "sketchpad"
      | "diffusionSettings"
  ) => {
    if (type === "sketchpad") {
      const center = getViewportCenter();
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

    const center = getViewportCenter();

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
  };

  useEffect(() => {
    if (tool === "brush") {
      setCurrentColor("#ffffff");
    }
  }, [setCurrentColor, tool]);

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white shadow-lg px-4 py-2 border-t border-gray-200">
      <div className="max-w-screen-2xl mx-auto relative flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-2">
          <Tooltip content="Asset Library" side="bottom">
            <ToolbarButton
              icon={<ImageIcon />}
              label="Assets"
              active={showAssets}
              onClick={toggleAssets}
            />
          </Tooltip>
          <UploadButton />
          <div className="w-px bg-gray-200 mx-2" />
        </div>
  
        {/* Center section */}
        <div className="flex items-center gap-4">
          {/* Text Prompt */}
          <Tooltip
            content="Create a new sticky note. Use the text to guide the AI image generation."
            side="bottom"
          >
            <ToolbarButton
              icon={<StickyNote />}
              label="Text Prompt"
              onClick={() => handleAddShape("sticky")}
            />
          </Tooltip>
  
          {/* Brush Controls Overlay */}
          {(tool === "brush" || tool === "eraser") && (
            <div className="absolute bottom-full mb-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg px-4 py-2 flex items-center gap-4">
              <input
                type="color"
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value)}
                className="w-8 h-8 p-0 cursor-pointer"
                title="Brush Color"
              />
  
              <BrushShapeSelector
                currentTexture={brushTexture}
                onTextureSelect={setBrushTexture}
              />
  
              {/* Brush Size */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Size</label>
                <input
                  type="range"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  min="1"
                  max="100"
                  className="w-full"
                  title="Brush Size"
                />
              </div>
  
              {/* Brush Opacity */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Opacity</label>
                <input
                  type="range"
                  value={brushOpacity}
                  onChange={(e) => setBrushOpacity(Number(e.target.value))}
                  min="0"
                  max="1"
                  step="0.1"
                  className="w-full"
                  title="Brush Opacity"
                />
              </div>
  
              {/* Brush Rotation */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Rotation</label>
                <input
                  type="range"
                  value={brushRotation}
                  onChange={(e) => setBrushRotation(Number(e.target.value))}
                  min="0"
                  max="360"
                  className="w-full"
                  title="Brush Rotation"
                />
              </div>
  
              {/* Follow Path */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="brushFollowPath"
                    checked={brushFollowPath}
                    onChange={(e) => useStore.getState().setBrushFollowPath(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="brushFollowPath" className="text-xs text-gray-500">
                    Follow
                  </label>
                </div>
              </div>
  
              {/* Brush Spacing */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Spacing</label>
                <input
                  type="range"
                  value={brushSpacing * 100}
                  onChange={(e) => setBrushSpacing(Number(e.target.value) / 100)}
                  min="5"
                  max="100"
                  className="w-full"
                  title="Brush Spacing"
                />
              </div>
            </div>
          )}
  
          {/* Sketchpad */}
          <Tooltip
            content="Create a sketch pad and guide the AI image generation by drawing."
            side="bottom"
          >
            <ToolbarButton
              icon={<BookImageIcon />}
              label="Sketch Prompt"
              onClick={() => handleAddShape("sketchpad")}
            />
          </Tooltip>
  
          <div className="w-px bg-gray-200 mx-2" />
  
          {/* Generate Button */}
          <Tooltip
            content={
              !hasActivePrompt || generatingPredictions.size > 0 
                ? "Add a text or image prompt to activate. Make sure Text Prompt is checked on a Sticky Note that has a prompt written. Or add an image and check a control type such as Remix"
                : <div>
                    <p>All checked notes and images will effect the generated image.</p>
                    <p>The first image may take up to 3 minutes to generate. After that it should only take a few seconds.</p>
                  </div>
            }
            side="top"
          >
            <ToolbarButton
              icon={generatingPredictions.size > 0 ? <Loader2 className="animate-spin" /> : <Sparkles />}
              label={generatingPredictions.size > 0 ? "Generating..." : "Generate"}
              variant="primary"
              disabled={!hasActivePrompt || generatingPredictions.size > 0}
              onClick={handleGenerate}
            />
          </Tooltip>
  
          {/* Settings Button */}
          <Tooltip
            content="Add settings to customize the image generation process. Control parameters like quality, size, and model type."
            side="bottom"
          >
            <ToolbarButton
              icon={<Settings />}
              onClick={() => handleAddShape("diffusionSettings")}
            />
          </Tooltip>
  
          {/* Tools Section */}
          <div className="w-px bg-gray-200 mx-2" />
          
          <ToolbarButton
            icon={<MousePointer />}
            active={tool === "select"}
            onClick={() => setTool("select")}
            title="Select Tool (V)"
          />
  
          <ToolbarButton
            icon={<Hand />}
            active={tool === "pan"}
            onClick={() => setTool("pan")}
            title="Pan Tool (Space)"
          />
        </div>
  
        {/* Right section */}
        <div>
          <ToolbarButton
            icon={<Grid />}
            label="Gallery"
            active={showGallery}
            onClick={toggleGallery}
          />
        </div>
      </div>
    </div>

  );
}