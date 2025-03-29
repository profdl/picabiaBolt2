import React from "react";
import {
  BookImageIcon,
  Grid,
  Image as ImageIcon,
  Loader2,
  Settings,
  Sparkles,
  StickyNote,
  X,
} from "lucide-react";
import { useStore } from "../../../store";
import { Tooltip } from "../../shared/Tooltip";
import { UploadButton } from "../../shared/UploadButton";
import { PropertiesToolbar } from "./PropertiesToolbar";
import { ToolbarButton } from "../../shared/ToolbarButton";
import { useToolbarBrush } from "../../../hooks/toolbar/useToolbarBrush";
import { useToolbarShapes } from "../../../hooks/toolbar/useToolbarShapes";
import { useToolbarGenerate } from "../../../hooks/toolbar/useToolbarGenerate";
import { useThemeClass } from "../../../styles/useThemeClass";
import { useShapeAdder } from "../../../hooks/shapes/useShapeAdder";
import { Shape } from "../../../types";
import { supabase } from "../../../lib/supabase";

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
      ghost: useThemeClass(["toolbar", "button", "ghost"]),
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
    addShape,
    setSelectedShapes,
    generatingPredictions,
    handleGenerate,
    cancelGeneration,
    tool,
    generatePreprocessedImage,
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
    addShape: state.addShape,
    setSelectedShapes: state.setSelectedShapes,
    generatingPredictions: state.generatingPredictions,
    handleGenerate: state.handleGenerate,
    cancelGeneration: state.cancelGeneration,
    tool: state.tool,
    generatePreprocessedImage: state.generatePreprocessedImage,
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

  const { showAssets, toggleAssets } = useToolbarShapes();

  const { hasActivePrompt } = useToolbarGenerate();

  const { toggleGallery } = useStore();

  // Check for any image shapes with makeVariations enabled
  const hasVariationsEnabled = shapes.some(
    (shape) => shape.type === "image" && shape.makeVariations
  );

  // Combine with existing hasActivePrompt
  const shouldEnableGenerate = hasActivePrompt || hasVariationsEnabled;

  useStore((state) => ({
    showAssets: state.showAssets,
    toggleAssets: state.toggleAssets,
  }));

  const handleAddSticky = async () => {
    // First, disable any existing sticky notes that have text prompt enabled
    shapes.forEach(shape => {
      if (shape.type === "sticky" && shape.isTextPrompt) {
        updateShape(shape.id, {
          isTextPrompt: false,
          color: shape.isNegativePrompt ? "var(--sticky-red)" : "var(--sticky-yellow)"
        });
      }
    });

    // Then create the new sticky note
    await addNewShape(
      "sticky",
      {
        color: "var(--sticky-green)",
        isEditing: true,
        isTextPrompt: true,
        textPromptStrength: 4.5,
        content: "Double-Click to Edit...",
        isNew: true
      } as Partial<Shape>,
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
    // Create a white background canvas
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 512);
    }

    await addNewShape(
      "image",
      {
        imageUrl: canvas.toDataURL('image/png'),
        aspectRatio: 1,
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

  const handleFlatten = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedShape) return;

    try {
      // Find the preview canvas for the selected shape
      const previewCanvas = document.querySelector(`canvas[data-shape-id="${selectedShape.id}"]`) as HTMLCanvasElement;
      if (!previewCanvas) {
        console.error('Preview canvas not found');
        return;
      }

      // Create a blob from the preview canvas
      const blob = await new Promise<Blob>((resolve, reject) => {
        previewCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/png', 1.0);
      });

      // Upload to Supabase
      const fileName = `flattened_${Math.random().toString(36).substring(2)}.png`;
      const arrayBuffer = await blob.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User must be authenticated');

      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(fileName, fileData, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("assets")
        .getPublicUrl(fileName);

      // Insert record in assets table
      await supabase.from("assets").insert([
        {
          url: publicUrl,
          user_id: user.id,
        },
      ]);

      // Create a new image shape with the flattened image
      const newShape: Shape = {
        id: Math.random().toString(36).substr(2, 9),
        type: "image",
        position: {
          x: selectedShape.position.x + selectedShape.width + 20,
          y: selectedShape.position.y,
        },
        width: selectedShape.width,
        height: selectedShape.height,
        rotation: 0,
        imageUrl: publicUrl,
        isUploading: false,
        model: "",
        useSettings: false,
        isEditing: false,
        color: "#ffffff",
        depthStrength: 0.75,
        edgesStrength: 0.75,
        contentStrength: 0.75,
        poseStrength: 0.75,
        sketchStrength: 0.75,
        imagePromptStrength: 0.75,
        showDepth: false,
        showEdges: false,
        showPose: false,
      };

      // Add the new shape
      addShape(newShape);
      setSelectedShapes([newShape.id]);
    } catch (error) {
      console.error("Error flattening image:", error);
    }
  };

  // Add handlers for image actions
  const handleCrop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedShape) {
      updateShape(selectedShape.id, { isImageEditing: true });
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
  } = useToolbarBrush();

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
          {(tool === "select" && selectedShape) || tool === "pan" ? (
            <PropertiesToolbar
              type={selectedShape?.type === "image" ? "image" : "shape"}
              shape={selectedShape || {
                id: "pan-tool",
                type: "group",
                position: { x: 0, y: 0 },
                width: 0,
                height: 0,
                rotation: 0,
                color: "transparent",
                groupEnabled: true,
              }}
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
                onFlatten: handleFlatten,
                addShape,
                generatePreprocessedImage: async (id: string, type: string) => {
                  await generatePreprocessedImage(id, type as "depth" | "edge" | "pose" | "sketch" | "imagePrompt");
                },
              }}
            />
          ) : null}

          {/* Brush Properties Toolbar */}
          {(tool === "brush" || tool === "eraser" || tool === "inpaint") && (
            <PropertiesToolbar
              type={tool === "brush" ? "brush" : tool === "eraser" ? "eraser" : "inpaint"}
              properties={{
                color: currentColor,
                texture: brushTexture,
                size: brushSize,
                opacity: brushOpacity,
                rotation: brushRotation,
                followPath: brushFollowPath,
                spacing: brushSpacing,
                hardness: brushHardness,
              }}
              onPropertyChange={(property, value) => {
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
              }}
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
                onFlatten: handleFlatten,
                addShape,
                generatePreprocessedImage: async (id: string, type: string) => {
                  await generatePreprocessedImage(id, type as "depth" | "edge" | "pose" | "sketch" | "imagePrompt");
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
          <div className="flex items-center gap-2">
            <Tooltip
              content={
                !shouldEnableGenerate || generatingPredictions.size > 0 ? (
                  "Add a text or image prompt to activate. Make sure Text Prompt is checked on a Sticky Note that has a prompt written. Or add an image and check a control type such as Remix or Make Variations"
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
                disabled={!shouldEnableGenerate || generatingPredictions.size > 0}
                onClick={async () => {
                  // If we have variations enabled or other active prompts, proceed with generation
                  handleGenerate();
                }}
                className={`${styles.button.base} ${styles.button.primary} ${
                  !shouldEnableGenerate || generatingPredictions.size > 0
                    ? "opacity-50"
                    : ""
                }`}
              />
            </Tooltip>

            {generatingPredictions.size > 0 && (
              <Tooltip content="Cancel generation" side="top">
                <ToolbarButton
                  icon={<X className="w-4 h-4" />}
                  onClick={() => {
                    // Cancel all generating predictions
                    Array.from(generatingPredictions).forEach(predictionId => {
                      cancelGeneration(predictionId);
                    });
                  }}
                  className={`${styles.button.base} ${styles.button.ghost} text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950`}
                />
              </Tooltip>
            )}
          </div>

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

          <div className={styles.divider} />
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
