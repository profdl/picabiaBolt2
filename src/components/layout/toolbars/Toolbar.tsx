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
import { useThemeClass } from '../../../styles/useThemeClass';




interface ToolbarProps {
  onShowImageGenerate: () => void;
  onShowUnsplash: () => void;
  onShowGallery: () => void;
  showImageGenerate?: boolean;
  showUnsplash?: boolean;
  showGallery?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ showGallery }) => {

    // Theme styles
    const styles = {
      container: useThemeClass(['toolbar', 'container']),
      button: {
        base: useThemeClass(['toolbar', 'button', 'base']),
        active: useThemeClass(['toolbar', 'button', 'active']),
        primary: useThemeClass(['toolbar', 'button', 'primary'])
      },
      controls: {
        container: useThemeClass(['toolbar', 'controls', 'container']),
        label: useThemeClass(['toolbar', 'controls', 'label']),
        input: useThemeClass(['toolbar', 'controls', 'input'])
      },
      divider: 'w-px bg-neutral-200 dark:bg-neutral-700 mx-2'
    };

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
    <div className={styles.container}>
      <div className="max-w-screen-2xl mx-auto relative flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-2">
          <Tooltip content="Asset Library" side="bottom">
            <ToolbarButton
              icon={<ImageIcon />}
              label="Assets" 
              active={showAssets}
              onClick={toggleAssets}
              className={`${styles.button.base} ${showAssets ? styles.button.active : ''}`}
            />
          </Tooltip>
          <UploadButton />
          <div className={styles.divider} />
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
              className={styles.button.base}
            />
          </Tooltip>


          {/* Brush Controls Overlay */}
          {(tool === "brush" || tool === "eraser") && (
            <div className={`absolute bottom-full mb-4 left-1/2 transform -translate-x-1/2 ${styles.container} min-w-max`}>
              <div className="flex items-center gap-3 px-3">
                <div className="relative">
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => setCurrentColor(e.target.value)}
                    className="w-8 h-8 !p-0 bg-transparent rounded cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none border border-gray-300 dark:border-gray-600"
                    title="Brush Color"
                  />
                </div>

                <BrushShapeSelector
                  currentTexture={brushTexture}
                  onTextureSelect={setBrushTexture}
                />

                <div className="flex items-center gap-3 flex-nowrap">
                  {/* Brush Size */}
                  <div className={`${styles.controls.container} w-[80px]`}>
                    <label className={styles.controls.label}>Size</label>
                    <input
                      type="range"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      min="1"
                      max="100"
                      className="w-full h-0.5 bg-gray-200 rounded-full appearance-none cursor-pointer hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-600 [&::-webkit-slider-thumb]:dark:bg-neutral-400"
                      title="Brush Size"
                    />
                  </div>

                  {/* Brush Opacity */}
                  <div className={`${styles.controls.container} w-[80px]`}>
                    <label className={styles.controls.label}>Opacity</label>
                    <input
                      type="range"
                      value={brushOpacity}
                      onChange={(e) => setBrushOpacity(Number(e.target.value))}
                      min="0"
                      max="1"
                      step="0.1"
                      className="w-full h-0.5 bg-gray-200 rounded-full appearance-none cursor-pointer hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-600 [&::-webkit-slider-thumb]:dark:bg-neutral-400"
                      title="Brush Opacity"
                    />
                  </div>

                  {/* Brush Rotation */}
                  <div className={`${styles.controls.container} w-[80px]`}>
                    <label className={styles.controls.label}>Rotation</label>
                    <input
                      type="range"
                      value={brushRotation}
                      onChange={(e) => setBrushRotation(Number(e.target.value))}
                      min="0"
                      max="360"
                      className="w-full h-0.5 bg-gray-200 rounded-full appearance-none cursor-pointer hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-600 [&::-webkit-slider-thumb]:dark:bg-neutral-400"
                      title="Brush Rotation"
                    />
                  </div>

                  {/* Follow Path */}
                  <div className={`${styles.controls.container} px-1`}>
                    <div className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        id="brushFollowPath"
                        checked={brushFollowPath}
                        onChange={(e) => useStore.getState().setBrushFollowPath(e.target.checked)}
                        className="w-3 h-3 text-neutral-600 dark:text-neutral-400 rounded border-neutral-300 dark:border-neutral-700"
                      />
                      <label htmlFor="brushFollowPath" className={styles.controls.label}>
                        Follow
                      </label>
                    </div>
                  </div>

                  {/* Brush Spacing */}
                  <div className={`${styles.controls.container} w-[80px]`}>
                    <label className={styles.controls.label}>Spacing</label>
                    <input
                      type="range"
                      value={brushSpacing * 100}
                      onChange={(e) => setBrushSpacing(Number(e.target.value) / 100)}
                      min="5"
                      max="100"
                      className="w-full h-0.5 bg-gray-200 rounded-full appearance-none cursor-pointer hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-600 [&::-webkit-slider-thumb]:dark:bg-neutral-400"
                      title="Brush Spacing"
                    />
                  </div>
                </div>
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
              className={styles.button.base}
            />
          </Tooltip>

          <div className={styles.divider} />

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
  disabled={!hasActivePrompt || generatingPredictions.size > 0}
  onClick={handleGenerate}
  className={`${styles.button.base} ${styles.button.primary} ${
    (!hasActivePrompt || generatingPredictions.size > 0) ? 'opacity-50' : ''
  }`}
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
              className={styles.button.base}
            />
          </Tooltip>

          {/* Tools Section */}
          <div className={styles.divider} />
          
          <ToolbarButton
            icon={<MousePointer />}
            active={tool === "select"}
            onClick={() => setTool("select")}
            title="Select Tool (V)"
            className={`${styles.button.base} ${tool === "select" ? styles.button.active : ''}`}
          />

          <ToolbarButton
            icon={<Hand />}
            active={tool === "pan"}
            onClick={() => setTool("pan")}
            title="Pan Tool (Space)"
            className={`${styles.button.base} ${tool === "pan" ? styles.button.active : ''}`}
          />
        </div>

        {/* Right section */}
        <div>
          <ToolbarButton
            icon={<Grid />}
            label="Gallery"
            active={showGallery}
            onClick={toggleGallery}
            className={`${styles.button.base} ${showGallery ? styles.button.active : ''}`}
          />
        </div>
      </div>
    </div>
  );
}