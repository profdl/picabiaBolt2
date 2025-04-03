import React, { useEffect, useState } from "react";
import { useStore } from "../../store";
import { Shape } from "../../types";
import { MiniToggle } from "../shared/MiniToggle";
import { SmallSlider } from "../shared/SmallSlider";
import { Tooltip } from "../shared/Tooltip";
import { generatePrompt } from "../../utils/prompt-generator";
import { EnableReferencePanel } from "../shared/EnableReferencePanel";
import { useThemeClass } from "../../styles/useThemeClass";
import { shapeLayout } from "../../utils/shapeLayout";
// import { Brush, Eraser, MousePointer } from "lucide-react";

interface ShapeControlsProps {
  shape: Shape;
  isSelected: boolean;
  handleResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void;
  hoveredGroup?: string | null;
  isAddedToGroup?: boolean;
}

export function ShapeControls({
  shape,
  isSelected,
  handleResizeStart,
  hoveredGroup,
  isAddedToGroup,
}: ShapeControlsProps) {
  // All hooks must be at the top
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const {
    updateShape,
    shapes,
    setSelectedShapes,
    tool,
    selectedShapes
  } = useStore((state) => ({
    updateShape: state.updateShape,
    shapes: state.shapes,
    setSelectedShapes: state.setSelectedShapes,
    tool: state.tool as "select" | "pan" | "pen" | "brush" | "eraser" | "inpaint",
    selectedShapes: state.selectedShapes
  }));

  // Define theme classes
  const styles = {
    resizeHandle: useThemeClass(["shape", "resizeHandle"]),
    sidePanel: {
      container: useThemeClass(["shape", "sidePanel", "container"]),
      group: useThemeClass(["shape", "sidePanel", "group"]),
      label: useThemeClass(["shape", "sidePanel", "label"])
    }
  };

  // Utility function to prevent event propagation
  const preventEvent = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  // Effect hooks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isDropdownOpen && !target.closest(".action-dropdown")) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  // Effect to automatically enable makeVariations when inpaint tool is activated
  useEffect(() => {
    if (tool === "inpaint" && shape.type === "image") {
      updateShape(shape.id, { makeVariations: true });
      setSelectedShapes([shape.id]);
    }
  }, [tool, shape.id, shape.type, updateShape, setSelectedShapes]);

  // Constants and derived state
  const anyCheckboxChecked =
    (shape.type === "depth" && shape.showDepth) ||
    (shape.type === "edges" && shape.showEdges) ||
    (shape.type === "pose" && shape.showPose) ||
    shape.showContent ||
    (shape.type === "sticky" && (shape.isTextPrompt || shape.isNegativePrompt)) ||
    (shape.type === "image" && (shape.showImagePrompt || shape.makeVariations)) ||
    (shape.type === "diffusionSettings" && shape.useSettings);

  // Determine if this is a selected image shape
  const isSelectedImage = shape.type === "image" && selectedShapes.includes(shape.id);
  
  // Show controls if:
  // 1. Shape is selected OR
  // 2. Any checkbox is checked OR
  // 3. Using brush/eraser/inpaint tool OR
  // 4. It's a selected image shape (regardless of tool)
  const showControlPanel = isSelected || anyCheckboxChecked || (tool === "brush" || tool === "eraser" || tool === "inpaint") || isSelectedImage;
  
  const showManipulationControls = isSelected;

  // Only return null if there's nothing to show at all
  const hasExternalControls = 
    ((shape.type === "image" || shape.type === "sketchpad") && (shape.showImagePrompt || (shape.type === "image" && shape.makeVariations))) ||
    (shape.type === "depth" && shape.showDepth) ||
    (shape.type === "edges" && shape.showEdges) ||
    (shape.type === "pose" && shape.showPose);

  // Hide controls only if no conditions are met
  if (!showControlPanel && !shape.isNew && shape.type !== "group" && !hasExternalControls) return null;

  return (
    <>
      {/* Only render the main container if showControlPanel is true */}
      {showControlPanel && (
        <div
          className={`absolute inset-0 ${isAddedToGroup ? 'group-add-blink' : ''}`}
          data-shape-control="true"
          style={{
            pointerEvents: "none",
            ...(isSelected && shape.type === "3d"
              ? {
                  border: "2px solid rgb(var(--neutral-500))",
                  borderRadius: "4px",
                }
              : {}),
            ...(isSelected && shape.type === "diffusionSettings"
              ? {
                  border: "2px solid rgb(var(--neutral-500))",
                  borderRadius: "8px",
                  backgroundColor: "transparent",
                  backgroundImage: "none",
                }
              : {}),
            ...(shape.type === "diffusionSettings" && shape.useSettings
              ? {
                  border: "2px solid #22c55e",
                  borderRadius: "8px",
                  backgroundColor: "transparent",
                  backgroundImage: "none",
                }
              : {}),
            ...(shape.type === "group" && hoveredGroup === shape.id
              ? {
                  border: "2px dashed rgb(var(--primary-500))",
                  backgroundColor: "rgba(var(--primary-500), 0.1)",
                  transition: "all 0.2s ease-in-out",
                }
              : {}),
          }}
        >
          {/* Only show resize handle when selected */}
          {showManipulationControls && (
            <div
              className={styles.resizeHandle}
              data-shape-control="true"
              style={{ zIndex: 1000, pointerEvents: "all" }}
              onMouseDown={(e) => {
                preventEvent(e);
                handleResizeStart(e);
              }}
            />
          )}
        </div>
      )}

      {/* Add brush, eraser, and select buttons for selected image shapes */}
      {/* Temporarily disabled brush, eraser, and select tools
      {(isSelected || tool === "brush" || tool === "eraser") && shape.type === "image" && (
        <div
          className="absolute -left-12 top-0 flex flex-col gap-1"
          data-shape-control="true"
          style={{ 
            zIndex: 1001, 
            pointerEvents: "all",
            position: "absolute",
            left: "-48px",
            top: "0px"
          }}
          onMouseDown={preventEvent}
          onClick={preventEvent}
        >
          <Tooltip content="Brush Tool (B)" side="right">
            <button
              type="button"
              className={`w-10 h-10 ${
                tool === "brush" 
                  ? "bg-neutral-100 dark:bg-[#3e3e3e] text-neutral-900 dark:text-white" 
                  : "bg-neutral-50 dark:bg-[#2c2c2c] text-neutral-700 dark:text-[#999999] hover:bg-neutral-100 dark:hover:bg-[#3e3e3e]"
              } rounded-lg transition-colors duration-200 flex items-center justify-center shadow-sm`}
              onClick={(e) => {
                preventEvent(e);
                setTool("brush");
                if (!selectedShapes.includes(shape.id)) {
                  setSelectedShapes([shape.id]);
                }
              }}
            >
              <Brush className="w-5 h-5" />
            </button>
          </Tooltip>

          <Tooltip content="Eraser Tool (E)" side="right">
            <button
              type="button"
              className={`w-10 h-10 ${
                tool === "eraser" 
                  ? "bg-neutral-100 dark:bg-[#3e3e3e] text-neutral-900 dark:text-white" 
                  : "bg-neutral-50 dark:bg-[#2c2c2c] text-neutral-700 dark:text-[#999999] hover:bg-neutral-100 dark:hover:bg-[#3e3e3e]"
              } rounded-lg transition-colors duration-200 flex items-center justify-center shadow-sm`}
              onClick={(e) => {
                preventEvent(e);
                setTool("eraser");
                if (!selectedShapes.includes(shape.id)) {
                  setSelectedShapes([shape.id]);
                }
              }}
            >
              <Eraser className="w-5 h-5" />
            </button>
          </Tooltip>

          <Tooltip content="Select Tool (V)" side="right">
            <button
              type="button"
              className={`w-10 h-10 ${
                tool === "select" 
                  ? "bg-neutral-100 dark:bg-[#3e3e3e] text-neutral-900 dark:text-white" 
                  : "bg-neutral-50 dark:bg-[#2c2c2c] text-neutral-700 dark:text-[#999999] hover:bg-neutral-100 dark:hover:bg-[#3e3e3e]"
              } rounded-lg transition-colors duration-200 flex items-center justify-center shadow-sm`}
              onClick={(e) => {
                preventEvent(e);
                setTool("select");
                if (!selectedShapes.includes(shape.id)) {
                  setSelectedShapes([shape.id]);
                }
              }}
            >
              <MousePointer className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      )}
      */}

      {shape.type === "diffusionSettings" && (
        <div
          className={`absolute left-1/2 -bottom-10 transform -translate-x-1/2 ${styles.sidePanel.container}`}
          data-shape-control="true"
          style={{ zIndex: 1000, pointerEvents: "all", width: "160px" }}
          onMouseDown={preventEvent}
          onClick={preventEvent}
        >
          <div 
            className={styles.sidePanel.group}
            data-shape-control="true"
            onMouseDown={preventEvent}
            onClick={preventEvent}
          >
            <MiniToggle
              id={`use-settings-${shape.id}`}
              checked={shape.useSettings || false}
              onChange={(checked) => {
                if (checked) {
                  // Uncheck all other diffusion settings shapes
                  shapes.forEach((otherShape) => {
                    if (
                      otherShape.type === "diffusionSettings" &&
                      otherShape.id !== shape.id
                    ) {
                      updateShape(otherShape.id, { useSettings: false });
                    }
                  });
                }
                updateShape(shape.id, { useSettings: checked });
              }}
              label="Use Settings"
            />
          </div>
        </div>
      )}
      {shape.type === "sticky" && isSelected && (
        <div
          className="absolute -left-0 -bottom-7"
          data-shape-control="true"
          style={{
            zIndex: 1000,
            pointerEvents: "all",
          }}
          onMouseDown={preventEvent}
          onClick={preventEvent}
        >
          <Tooltip content="Add a random text prompt" side="bottom">
            <button
              type="button"
              className="w-6 h-6 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center justify-center shadow-sm action-dropdown"
              data-shape-control="true"
              style={{
                pointerEvents: "all",
                position: "relative",
              }}
              onMouseDown={(e) => {
                preventEvent(e);
                const randomPrompt = generatePrompt();
                const minSize = shapeLayout.calculateTextContentSize(randomPrompt, shape.fontSize || 16);
                updateShape(shape.id, {
                  content: randomPrompt,
                  isEditing: true,
                  width: Math.max(shape.width, minSize.width),
                  height: Math.max(shape.height, minSize.height)
                });
              }}
              onClick={preventEvent}
            >
              <img
                src="/dice-outline.svg"
                alt="Random prompt"
                className="w-5 h-5 text-neutral-600 dark:text-neutral-300"
                style={{ pointerEvents: "none" }}
              />
            </button>
          </Tooltip>
        </div>
      )}

      {shape.type === "sticky" && (
        <div
          className={`absolute left-1/2 top-full mt-1 transform -translate-x-1/2 ${styles.sidePanel.container}`}
          data-shape-control="true"
          style={{ zIndex: 1000, pointerEvents: "all", width: "160px" }}
          onMouseDown={preventEvent}
          onClick={preventEvent}
        >
          <div className="flex flex-col gap-1.5">
            <Tooltip
              side="bottom"
              content={
                <div>
                  <h4 className="font-medium mb-1">Text Prompt</h4>
                  <p>
                    Enable this to use the sticky note text as a prompt for
                    image generation. The AI will create an image based on your
                    written description. Only one note at a time can be used as
                    a prompt.
                  </p>
                </div>
              }
            >
              <div className={styles.sidePanel.group}>
                <MiniToggle
                  id={`prompt-${shape.id}`}
                  checked={shape.isTextPrompt || false}
                  onChange={(checked: boolean) => {
                    // Just update this sticky note - the store will handle the rest
                    updateShape(shape.id, {
                      isTextPrompt: checked,
                      color: checked ? "var(--sticky-green)" : (shape.isNegativePrompt ? "var(--sticky-red)" : "var(--sticky-yellow)"),
                      textPromptStrength: shape.textPromptStrength || 4.5
                    });
                  }}
                  label="Text Prompt"
                />
              </div>
            </Tooltip>

            {shape.isTextPrompt && (
              <div className="px-2">
                <SmallSlider
                  value={shape.textPromptStrength || 4.5}
                  onChange={(value) => {
                    updateShape(shape.id, { textPromptStrength: value });
                  }}
                  min={1}
                  max={10}
                  step={0.1}
                  label="Strength (CFG)"
                />
              </div>
            )}

            <Tooltip
              side="bottom"
              content={
                <div>
                  <h4 className="font-medium mb-1">Negative Prompt</h4>
                  <p>
                    Use this to specify elements you want to avoid in the
                    generated image. The AI will try to exclude these
                    characteristics from the result.
                  </p>
                </div>
              }
            >
              <div className={styles.sidePanel.group}>
                <MiniToggle
                  id={`negative-${shape.id}`}
                  checked={shape.isNegativePrompt || false}
                  onChange={(checked) => {
                    // Just update this sticky note - the store will handle the rest
                    updateShape(shape.id, {
                      isNegativePrompt: checked,
                      color: checked ? "var(--sticky-red)" : (shape.isTextPrompt ? "var(--sticky-green)" : "var(--sticky-yellow)")
                    });
                  }}
                  label="Negative Prompt"
                />
              </div>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Image Prompt Controls */}
      {shape.type === "image" && (
        <div
          className="absolute left-2 top-full mt-1"
          data-shape-control="true"
          style={{ zIndex: 1000, pointerEvents: "all" }}
          onMouseDown={preventEvent}
          onClick={preventEvent}
        >
          <div className={`flex ${shape.width < 340 ? 'flex-col gap-1' : 'flex-row gap-2'}`}>
            {/* Image Reference Controls */}
            {(isSelected || shape.showImagePrompt) && (
              <div className="flex justify-start">
                <div className="mb-1">
                  <div
                    className={`${styles.sidePanel.container} p-0`}
                    style={{ minWidth: "140px", width: "max-content" }}
                    data-shape-control="true"
                    onMouseDown={preventEvent}
                    onClick={preventEvent}
                  >
                    <div className="py-[2px]">
                      <div className={`${styles.sidePanel.group} w-full px-1`}>
                        <MiniToggle
                          id={`imagePrompt-${shape.id}`}
                          checked={shape.showImagePrompt || false}
                          onChange={(checked: boolean) => {
                            updateShape(shape.id, { 
                              showImagePrompt: checked,
                              imagePromptStrength: checked ? 0.5 : shape.imagePromptStrength || 0.5  // Preserve existing strength or use default
                            });
                            setSelectedShapes([shape.id]); // Keep shape selected when toggling
                          }}
                          label="Use Image Reference"
                        />
                      </div>
                    </div>
                    
                    {shape.showImagePrompt && (
                      <div className="py-[2px]">
                        <div className={`${styles.sidePanel.group} w-full px-1`}>
                          <Tooltip
                            content={
                              <div>
                                <h4 className="font-medium mb-1">Image is a drawing</h4>
                                <p>
                                  Enable this if your image is a sketch or drawing. The AI will interpret 
                                  the lines and shapes as guidance rather than trying to reproduce the image exactly.
                                </p>
                              </div>
                            }
                            side="bottom"
                          >
                            <MiniToggle
                              id={`isDrawing-${shape.id}`}
                              checked={shape.isDrawing || false}
                              onChange={(checked: boolean) => {
                                updateShape(shape.id, { isDrawing: checked });
                              }}
                              label="Image is a drawing"
                            />
                          </Tooltip>
                        </div>
                      </div>
                    )}
                    
                    {shape.showImagePrompt && (
                      <div className="w-full pl-[2px] pr-2 pt-1 pb-2">
                        <SmallSlider
                          value={shape.imagePromptStrength || 0.5}
                          onChange={(value: number) => {
                            updateShape(shape.id, { imagePromptStrength: value });
                          }}
                          min={0.05}
                          max={1.00}
                          step={0.05}
                          label="Reference Strength"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Variations Controls - Only show for image type */}
            {(isSelected || shape.makeVariations) && (
              <div className="flex justify-start">
                <EnableReferencePanel
                  id={`makeVariations-${shape.id}`}
                  label="Make Variations"
                  checked={shape.makeVariations || false}
                  onToggleChange={(checked: boolean) => {
                    if (checked) {
                      // Disable makeVariations on all other image shapes
                      shapes.forEach((otherShape) => {
                        if (otherShape.type === "image" && otherShape.id !== shape.id) {
                          updateShape(otherShape.id, { makeVariations: false });
                        }
                      });
                    }
                    updateShape(shape.id, { makeVariations: checked });
                    setSelectedShapes([shape.id]); // Keep shape selected when toggling
                  }}
                  sliderValue={shape.variationStrength || 0.75}
                  onSliderChange={(value: number) => {
                    updateShape(shape.id, { variationStrength: value });
                  }}
                  onMouseDown={preventEvent}
                  onClick={preventEvent}
                  showSlider={true}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Move depth controls outside the inset-0 container */}
      {shape.type === "depth" && (isSelected || shape.showDepth) && (
        <div
          className="absolute left-2 top-full mt-1"
          data-shape-control="true"
          style={{ zIndex: 1000, pointerEvents: "all" }}
          onMouseDown={preventEvent}
          onClick={preventEvent}
        >
          <EnableReferencePanel
            id={`enable-depth-${shape.id}`}
            label="Use Depth Reference"
            checked={shape.showDepth || false}
            onToggleChange={(checked: boolean) => {
              if (checked) {
                // If enabling this depth reference, disable all others
                shapes.forEach((otherShape) => {
                  if (otherShape.type === "depth" && otherShape.id !== shape.id) {
                    updateShape(otherShape.id, { showDepth: false });
                  }
                });
              }
              updateShape(shape.id, { showDepth: checked });
            }}
            sliderValue={shape.depthStrength || 0.5}
            onSliderChange={(value: number) => {
              updateShape(shape.id, { depthStrength: value });
            }}
            onMouseDown={preventEvent}
            onClick={preventEvent}
          />
        </div>
      )}

      {/* Edge controls */}
      {shape.type === "edges" && (isSelected || shape.showEdges) && (
        <div
          className="absolute left-2 top-full mt-1"
          data-shape-control="true"
          style={{ zIndex: 1000, pointerEvents: "all" }}
          onMouseDown={preventEvent}
          onClick={preventEvent}
        >
          <EnableReferencePanel
            id={`enable-edges-${shape.id}`}
            label="Use Edge Reference"
            checked={shape.showEdges || false}
            onToggleChange={(checked: boolean) => {
              if (checked) {
                // If enabling this edge reference, disable all others
                shapes.forEach((otherShape) => {
                  if (otherShape.type === "edges" && otherShape.id !== shape.id) {
                    updateShape(otherShape.id, { showEdges: false });
                  }
                });
              }
              updateShape(shape.id, { showEdges: checked });
            }}
            sliderValue={shape.edgesStrength || 0.5}
            onSliderChange={(value: number) => {
              updateShape(shape.id, { edgesStrength: value });
            }}
            onMouseDown={preventEvent}
            onClick={preventEvent}
          />
        </div>
      )}

      {/* Pose controls */}
      {shape.type === "pose" && (isSelected || shape.showPose) && (
        <div
          className="absolute left-2 top-full mt-1"
          data-shape-control="true"
          style={{ zIndex: 1000, pointerEvents: "all" }}
          onMouseDown={preventEvent}
          onClick={preventEvent}
        >
          <EnableReferencePanel
            id={`enable-pose-${shape.id}`}
            label="Use Pose Reference"
            checked={shape.showPose || false}
            onToggleChange={(checked: boolean) => {
              if (checked) {
                // If enabling this pose reference, disable all others
                shapes.forEach((otherShape) => {
                  if (otherShape.type === "pose" && otherShape.id !== shape.id) {
                    updateShape(otherShape.id, { showPose: false });
                  }
                });
              }
              updateShape(shape.id, { showPose: checked });
            }}
            sliderValue={shape.poseStrength || 0.5}
            onSliderChange={(value: number) => {
              updateShape(shape.id, { poseStrength: value });
            }}
            onMouseDown={preventEvent}
            onClick={preventEvent}
          />
        </div>
      )}
    </>
  );
}