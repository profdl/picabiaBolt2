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
import { useEffect } from "react";
import { Tooltip } from "../../shared/Tooltip";
import { UploadButton } from "../../shared/UploadButton";
import { BrushShapeSelector } from "./BrushShapeSelector";
import { ToolbarButton } from "../../shared/ToolbarButton";
import { useToolbarBrush } from '../../../hooks/useToolbarBrush';
import { useToolbarShapes } from '../../../hooks/useToolbarShapes';
import { useToolbarGenerate } from '../../../hooks/useToolbarGenerate';



interface ToolbarProps {
  onShowImageGenerate: () => void;
  onShowUnsplash: () => void;
  onShowGallery: () => void;
  showImageGenerate?: boolean;
  showUnsplash?: boolean;
  showGallery?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ showGallery }) => {
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
    brushSpacing,
    setBrushSpacing,
    tool,
    setTool
  } = useToolbarBrush();

  const {
    handleAddShape,
    showAssets,
    toggleAssets,
  } = useToolbarShapes();

  const {
    hasActivePrompt,
    generatingPredictions,
    handleGenerate
  } = useToolbarGenerate();

  const { toggleGallery } = useStore();
  
  useStore((state) => ({
    showAssets: state.showAssets,
    toggleAssets: state.toggleAssets,
  }));

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