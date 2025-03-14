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
import { useToolbarBrush } from "../../../hooks/toolbar/useToolbarBrush";
import { useToolbarShapes } from "../../../hooks/toolbar/useToolbarShapes";
import { useToolbarGenerate } from "../../../hooks/toolbar/useToolbarGenerate";
import { useThemeClass } from "../../../styles/useThemeClass";
import { useShapeAdder } from "../../../hooks/shapes/useShapeAdder";
import { Brush } from "lucide-react";
import { Shape } from "../../../types";

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
    handleGenerateSubject,
    create3DDepth: create3DDepthAction,
    updateShape,
    selectedShapes,
    shapes,
    sendBackward,
    sendForward,
    sendToBack,
    sendToFront,
    duplicate,
    deleteShape,
    createGroup,
    ungroup,
    addToGroup,
    removeFromGroup,
    mergeImages,
  } = useStore((state) => ({
    handleGenerateSubject: state.handleGenerateSubject,
    create3DDepth: state.create3DDepth as (shape: Shape, position: { x: number; y: number }) => void,
    updateShape: state.updateShape,
    selectedShapes: state.selectedShapes,
    shapes: state.shapes,
    sendBackward: state.sendBackward,
    sendForward: state.sendForward,
    sendToBack: state.sendToBack,
    sendToFront: state.sendToFront,
    duplicate: state.duplicate,
    deleteShape: state.deleteShape,
    createGroup: state.createGroup,
    ungroup: state.ungroup,
    addToGroup: state.addToGroup,
    removeFromGroup: state.removeFromGroup,
    mergeImages: state.mergeImages,
  }));

  const selectedShape = shapes.find((s) => selectedShapes.includes(s.id));

  const {
    setBrushTexture,
    setBrushSize,
    setBrushOpacity,
    setBrushRotation,
    setBrushFollowPath,
    setBrushSpacing,
    setBrushHardness,
  } = useStore((state) => ({
    setCurrentColor: state.setCurrentColor,
    setBrushTexture: state.setBrushTexture,
    setBrushSize: state.setBrushSize,
    setBrushOpacity: state.setBrushOpacity,
    setBrushRotation: state.setBrushRotation,
    setBrushFollowPath: state.setBrushFollowPath,
    setBrushSpacing: state.setBrushSpacing,
    setBrushHardness: state.setBrushHardness,
  }));

  // Add handlers for image actions
  const handleCrop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedShape) {
      updateShape(selectedShape.id, { isEditing: true });
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedShape?.imageUrl) {
      try {
        const response = await fetch(selectedShape.imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `image-${selectedShape.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Download failed:", error);
      }
    }
  };

  const handlePropertyChange = (property: string, value: unknown) => {
    switch (property) {
      case "color":
        setCurrentColor(value as string);
        break;
      case "texture":
        setBrushTexture(value as string);
        break;
      case "size":
        setBrushSize(value as number);
        break;
      case "opacity":
        setBrushOpacity(value as number);
        break;
      case "rotation":
        setBrushRotation(value as number);
        break;
      case "followPath":
        setBrushFollowPath(value as boolean);
        break;
      case "spacing":
        setBrushSpacing(value as number);
        break;
      case "hardness":
        setBrushHardness(value as number);
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
    brushHardness,
    tool,
    setTool,
  } = useToolbarBrush();

  const { showAssets, toggleAssets } = useToolbarShapes();

  const { hasActivePrompt, generatingPredictions, handleGenerate } =
    useToolbarGenerate();

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
      "sticky",
      {
        color: "var(--sticky-green)",
        isEditing: true,
      },
      "",
      {
        centerOnShape: true,
        setSelected: true,
        startEditing: true,
        defaultWidth: 200,
      }
    );
  };

  const handleAddSketchpad = async () => {
    await addNewShape(
      "sketchpad",
      {
        showSketch: true,
      },
      "",
      {
        centerOnShape: true,
        setSelected: true,
        defaultWidth: 400,
      }
    );
  };

  const handleAddDiffusionSettings = async () => {
    shapes.forEach((shape) => {
      if (shape.type === "diffusionSettings" && shape.useSettings) {
        updateShape(shape.id, { useSettings: false });
      }
    });

    await addNewShape(
      "diffusionSettings",
      {
        useSettings: true, // Set useSettings to true for the new shape
      },
      "",
      {
        centerOnShape: true,
        setSelected: true,
        defaultWidth: 300,
      }
    );
  };

  const handleAddImagePlaceholder = async () => {
    await addNewShape(
      "image",
      {
        isUploading: true,
      },
      "",
      {
        centerOnShape: true,
        setSelected: true,
        defaultWidth: 300,
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

          {/* Image Properties Toolbar */}
          {tool === "select" && selectedShape && (
            <PropertiesToolbar
              type={selectedShape.type === "image" ? "image" : "shape"}
              shape={selectedShape}
              selectedShapes={selectedShapes}
              shapes={shapes}
              actions={{
                sendBackward,
                sendForward,
                sendToBack,
                sendToFront,
                duplicate,
                deleteShape,
                createGroup,
                ungroup,
                addToGroup,
                removeFromGroup,
                mergeImages,
                onSelectSubject: (e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (selectedShape) {
                    handleGenerateSubject(selectedShape);
                  }
                },
                onCrop: handleCrop,
                onDownload: handleDownload,
                create3DDepth: create3DDepthAction,
              }}
            />
          )}

          {/* Brush Properties Toolbar */}
          {(tool === "brush" || tool === "eraser") && (
            <PropertiesToolbar
              type={tool === "brush" ? "brush" : tool === "eraser" ? "eraser" : "shape"}
              properties={
                tool === "brush" || tool === "eraser"
                  ? {
                      color: currentColor,
                      texture: brushTexture,
                      size: brushSize,
                      opacity: brushOpacity,
                      rotation: brushRotation,
                      followPath: brushFollowPath,
                      spacing: brushSpacing,
                      hardness: brushHardness,
                    }
                  : undefined
              }
              onPropertyChange={handlePropertyChange}
              shape={selectedShape}
              selectedShapes={selectedShapes}
              shapes={shapes}
              actions={{
                sendBackward,
                sendForward,
                sendToBack,
                sendToFront,
                duplicate,
                deleteShape,
                createGroup,
                ungroup,
                addToGroup,
                removeFromGroup,
                mergeImages,
                onSelectSubject: (e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (selectedShape) {
                    handleGenerateSubject(selectedShape);
                  }
                },
                onCrop: handleCrop,
                onDownload: handleDownload,
                create3DDepth: (shapeOrEvent: Shape | React.MouseEvent, position?: { x: number; y: number }) => {
                  if ('preventDefault' in shapeOrEvent) {
                    // Handle as event
                    shapeOrEvent.preventDefault();
                    shapeOrEvent.stopPropagation();
                    if (selectedShape?.type === "image" && selectedShape.depthPreviewUrl) {
                      const newX = selectedShape.position.x + selectedShape.width + 20;
                      create3DDepthAction(selectedShape, {
                        x: newX,
                        y: selectedShape.position.y,
                      });
                    }
                  } else {
                    // Handle as direct function call
                    if (position) {
                      create3DDepthAction(shapeOrEvent, position);
                    }
                  }
                },
              }}
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
            content={
              !hasActivePrompt || generatingPredictions.size > 0 ? (
                "Add a text or image prompt to activate. Make sure Text Prompt is checked on a Sticky Note that has a prompt written. Or add an image and check a control type such as Remix"
              ) : (
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
              )
            }
            side="top"
          >
            <ToolbarButton
              icon={
                generatingPredictions.size > 0 ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Sparkles />
                )
              }
              label={
                generatingPredictions.size > 0 ? "Generating..." : "Generate"
              }
              disabled={!hasActivePrompt || generatingPredictions.size > 0}
              onClick={async () => {
                if (!hasActivePrompt) {
                  await handleAddImagePlaceholder();
                }
                handleGenerate();
              }}
              className={`${styles.button.base} ${styles.button.primary} ${
                !hasActivePrompt || generatingPredictions.size > 0
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

          <Tooltip content="Brush Tool" side="bottom">
            <ToolbarButton
              icon={<Brush />}
              active={tool === "brush"}
              onClick={() => {
                setTool("brush");
                setCurrentColor("#ffffff");
              }}
              title="Brush Tool (B)"
              className={`${styles.button.base} ${
                tool === "brush" ? styles.button.active : ""
              }`}
            />
          </Tooltip>

          {/* <Tooltip content="Eraser Tool" side="bottom">
            <ToolbarButton
              icon={<Eraser />}
              active={tool === "eraser"}
              onClick={() => {
                setTool("eraser");
                setCurrentColor("#000000");
              }}
              title="Eraser Tool (E)"
              className={`${styles.button.base} ${
                tool === "eraser" ? styles.button.active : ""
              }`}
            />
          </Tooltip> */}

          {/* <div className={styles.divider} /> */}

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
};
