import {
  BookImageIcon,
  Grid,
  Hand,
  Image as ImageIcon,
  Loader2,
  MousePointer,
  Settings,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { useStore } from "../../../store";
import { useEffect } from "react";
import { Tooltip } from "../../shared/Tooltip";
import { UploadButton } from "../../shared/UploadButton";
import { PropertiesToolbar } from "./PropertiesToolbar";
import { ToolbarButton } from "../../shared/ToolbarButton";
import { useToolbarBrush } from "../../../hooks/useToolbarBrush";
import { useToolbarShapes } from "../../../hooks/useToolbarShapes";
import { useToolbarGenerate } from "../../../hooks/useToolbarGenerate";
import { useThemeClass } from "../../../styles/useThemeClass";
import { useShapeAdder } from "../../../hooks/useShapeAdder";


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
    container: useThemeClass(["toolbar", "container"]),
    button: {
      base: useThemeClass(["toolbar", "button", "base"]),
      active: useThemeClass(["toolbar", "button", "active"]),
      primary: useThemeClass(["toolbar", "button", "primary"]),
    },
    controls: {
      container: useThemeClass(["toolbar", "controls", "container"]),
      label: useThemeClass(["toolbar", "controls", "label"]),
      input: useThemeClass(["toolbar", "controls", "input"]),
    },
    divider: "w-px bg-neutral-200 dark:bg-neutral-700 mx-2",
  };

  const { addNewShape } = useShapeAdder(); 

  const {
    setBrushTexture,
    setBrushSize,
    setBrushOpacity,
    setBrushRotation,
    setBrushFollowPath,
    setBrushSpacing,
  } = useStore((state) => ({
    setCurrentColor: state.setCurrentColor,
    setBrushTexture: state.setBrushTexture,
    setBrushSize: state.setBrushSize,
    setBrushOpacity: state.setBrushOpacity,
    setBrushRotation: state.setBrushRotation,
    setBrushFollowPath: state.setBrushFollowPath,
    setBrushSpacing: state.setBrushSpacing,
  }));

  const handlePropertyChange = (property: string, value: unknown) => {
    switch (property) {
      case 'color':
        setCurrentColor(value as string);
        break;
      case 'texture':
        setBrushTexture(value as string);
        break;
      case 'size':
        setBrushSize(value as number);
        break;
      case 'opacity':
        setBrushOpacity(value as number);
        break;
      case 'rotation':
        setBrushRotation(value as number);
        break;
      case 'followPath':
        setBrushFollowPath(value as boolean);
        break;
      case 'spacing':
        setBrushSpacing(value as number);
        break;
    }
  };


  const {
    currentColor,
    setCurrentColor,
    brushTexture,
    brushSize,
    brushOpacity,
    brushRotation,
    brushFollowPath,
    brushSpacing,
    tool,
    setTool,
  } = useToolbarBrush();

  const {
    showAssets,
    toggleAssets,
  } = useToolbarShapes();

  const {
    hasActivePrompt,
    generatingPredictions,
    handleGenerate,
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


  const handleAddSticky = async () => {
    await addNewShape(
      'sticky',
      {
        color: 'var(--sticky-green)',
        isEditing: true
      },
      '',
      {
        centerOnShape: true,
        setSelected: true,
        startEditing: true,
        defaultWidth: 200
      }
    );
  };

  const handleAddSketchpad = async () => {
    await addNewShape(
      'sketchpad',
      {
        locked: true,
        showSketch: true
      },
      '',
      {
        centerOnShape: true,
        setSelected: true,
        defaultWidth: 400
      }
    );
  };

  const handleAddDiffusionSettings = async () => {
    await addNewShape(
      'diffusionSettings',
      {},
      '',
      {
        centerOnShape: true,
        setSelected: true,
        defaultWidth: 300
      }
    );
  };

  const handleAddImagePlaceholder = async () => {
    await addNewShape(
      'image',
      {
        isUploading: true
      },
      '',
      {
        centerOnShape: true,
        setSelected: true,
        defaultWidth: 300
      }
    );
  };

  


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
              className={`${styles.button.base} ${
                showAssets ? styles.button.active : ""
              }`}
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
              onClick={handleAddSticky}
              className={styles.button.base}
            />
          </Tooltip>

          {/* Brush Controls Overlay */}
          {(tool === "brush" || tool === "eraser") && (
        <PropertiesToolbar
          type={tool}
          properties={{
            color: currentColor,
            texture: brushTexture,
            size: brushSize,
            opacity: brushOpacity,
            rotation: brushRotation,
            followPath: brushFollowPath,
            spacing: brushSpacing,
          }}
          onPropertyChange={handlePropertyChange}
        />
      )}

          {/* Sketchpad */}
          <Tooltip
            content="Create a sketch pad and guide the AI image generation by drawing."
            side="bottom"
          >
            <ToolbarButton
              icon={<BookImageIcon />}
              label="Sketch Prompt"
              onClick={handleAddSketchpad}
              className={styles.button.base}
            />
          </Tooltip>

          <div className={styles.divider} />

          {/* Generate Button */}
          <Tooltip
            content={!hasActivePrompt || generatingPredictions.size > 0
              ? "Add a text or image prompt to activate. Make sure Text Prompt is checked on a Sticky Note that has a prompt written. Or add an image and check a control type such as Remix"
              : (
                <div>
                  <p>
                    All checked notes and images will effect the generated
                    image.
                  </p>
                  <p>
                    The first image may take up to 3 minutes to generate. After
                    that it should only take a few seconds.
                  </p>
                </div>
              )}
            side="top"
          >
            <ToolbarButton
              icon={generatingPredictions.size > 0
                ? <Loader2 className="animate-spin" />
                : <Sparkles />}
              label={generatingPredictions.size > 0
                ? "Generating..."
                : "Generate"}
              disabled={!hasActivePrompt || generatingPredictions.size > 0}
              onClick={async () => {
                if (!hasActivePrompt) {
                  await handleAddImagePlaceholder();
                }
                handleGenerate();
              }}
              className={`${styles.button.base} ${styles.button.primary} ${
                (!hasActivePrompt || generatingPredictions.size > 0)
                  ? "opacity-50"
                  : ""
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
              onClick={handleAddDiffusionSettings}
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
            className={`${styles.button.base} ${
              tool === "select" ? styles.button.active : ""
            }`}
          />

          <ToolbarButton
            icon={<Hand />}
            active={tool === "pan"}
            onClick={() => setTool("pan")}
            title="Pan Tool (Space)"
            className={`${styles.button.base} ${
              tool === "pan" ? styles.button.active : ""
            }`}
          />
        </div>

        {/* Right section */}
        <div>
          <ToolbarButton
            icon={<Grid />}
            label="Gallery"
            active={showGallery}
            onClick={toggleGallery}
            className={`${styles.button.base} ${
              showGallery ? styles.button.active : ""
            }`}
          />
        </div>
      </div>
    </div>
  );
}