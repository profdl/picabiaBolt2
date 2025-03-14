import { useState, useEffect } from "react";
import { useStore } from "../../store";
import { Shape } from "../../types";
import { generatePrompt } from "../../utils/prompt-generator";
import { Tooltip } from "../shared/Tooltip";
import { useThemeClass } from "../../styles/useThemeClass";
import { supabase } from "../../lib/supabase";
import { MiniToggle } from "../shared/MiniToggle";
import { EnableReferencePanel } from "../shared/EnableReferencePanel";
import { SmallSlider } from "../shared/SmallSlider";

interface ShapeControlsProps {
  shape: Shape;
  isSelected: boolean;
  handleResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void;
}

interface ShapeUpdate {
  id: string;
  shape: Partial<Shape>;
}

export function ShapeControls({
  shape,
  isSelected,
  handleResizeStart,
}: ShapeControlsProps) {
  // All hooks must be at the top
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { updateShape, shapes, setSelectedShapes, updateShapes, addShape, generatePreprocessedImage } = useStore();

  // Add state for tracking pending updates
  const [pendingUpdates, setPendingUpdates] = useState<{ 
    id: string; 
    isChecked: boolean; 
    isTextPrompt?: boolean;
    isNegativePrompt?: boolean;
  } | null>(null);

  // Styles
  const styles = {
    controls: {
      panel: useThemeClass(["shape", "controls", "panel"]),
      panelMod: useThemeClass(["shape", "controls", "panelMod"]),
      group: useThemeClass(["shape", "controls", "group"]),
      checkbox: useThemeClass(["forms", "checkbox"]),
      label: useThemeClass(["shape", "controls", "label"]),
      slider: useThemeClass(["shape", "controls", "slider"]),
      tooltip: useThemeClass(["shape", "controls", "tooltip"]),
      button: useThemeClass(["shape", "controls", "button"]),
      buttonActive: useThemeClass(["shape", "controls", "buttonActive"]),
    },
    sidePanel: {
      container: useThemeClass(["shape", "sidePanel", "container"]),
      group: useThemeClass(["shape", "sidePanel", "group"]),
      checkbox: useThemeClass(["forms", "checkbox"]),
      label: useThemeClass(["shape", "sidePanel", "label"]),
    },
    resizeHandle: useThemeClass(["shape", "resizeHandle"]),
  };

  // Utility function to prevent event propagation
  const preventEvent = (e: React.MouseEvent | React.ChangeEvent<HTMLInputElement>) => {
    if ('preventDefault' in e) {
      e.preventDefault();
      e.stopPropagation();
    }
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

  // Effect to handle updates to other shapes
  useEffect(() => {
    if (!pendingUpdates) return;

    const { id, isChecked, isTextPrompt } = pendingUpdates;
    
    if (isChecked) {
      const updates: ShapeUpdate[] = [];
      shapes.forEach((otherShape) => {
        if (
          otherShape.id !== id &&
          otherShape.type === "sticky" &&
          // Only uncheck the same type of prompt that was checked
          (isTextPrompt ? otherShape.isTextPrompt : otherShape.isNegativePrompt)
        ) {
          updates.push({
            id: otherShape.id,
            shape: {
              // Only update the relevant prompt type
              ...(isTextPrompt ? { isTextPrompt: false } : { isNegativePrompt: false }),
              // Update color based on remaining prompt state
              color: isTextPrompt 
                ? (otherShape.isNegativePrompt ? "var(--sticky-red)" : "var(--sticky-yellow)")
                : (otherShape.isTextPrompt ? "var(--sticky-green)" : "var(--sticky-yellow)")
            }
          });
        }
      });
      
      if (updates.length > 0) {
        updateShapes(updates);
      }
    }
    
    setPendingUpdates(null);
  }, [pendingUpdates, shapes, updateShapes]);

  // Constants and derived state
  const anyCheckboxChecked =
    (shape.type === "depth" && shape.showDepth) ||
    (shape.type === "edges" && shape.showEdges) ||
    (shape.type === "pose" && shape.showPose) ||
    shape.showContent ||
    shape.isTextPrompt ||
    shape.isNegativePrompt ||
    (shape.type === "image" && shape.showImagePrompt) ||
    (shape.type === "diffusionSettings" && shape.useSettings);

  const showControlPanel = isSelected || anyCheckboxChecked;
  const showManipulationControls = isSelected;

  // Now we can safely return early if needed
  if (!showControlPanel && !shape.isNew && shape.type !== "group") return null;

  return (
    <>
      <div
        className="absolute inset-0"
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
        }}
      >
        {/* Bottom Controls Container */}
        {(shape.type === "image" || shape.type === "sketchpad") && (isSelected || shape.showImagePrompt) && (
          <div
            className="absolute left-2 top-full mt-1"
            data-shape-control="true"
            style={{ 
              zIndex: 1000, 
              pointerEvents: "all"
            }}
            onMouseDown={preventEvent}
            onClick={preventEvent}
          >
            <div className={`flex ${shape.width < 340 ? 'flex-col gap-1' : 'flex-row gap-2'}`}>
              {/* Image Prompt Controls - Left Box */}
              <div className="flex justify-start">
                <EnableReferencePanel
                  id={`imagePrompt-${shape.id}`}
                  label="Use Image Reference"
                  checked={shape.showImagePrompt || false}
                  onToggleChange={(checked: boolean) => {
                    updateShape(shape.id, { 
                      showImagePrompt: checked,
                      imagePromptStrength: checked ? 0.5 : undefined 
                    });
                  }}
                  sliderValue={shape.imagePromptStrength || 0.5}
                  onSliderChange={(value: number) => {
                    updateShape(shape.id, { imagePromptStrength: value });
                  }}
                  onMouseDown={preventEvent}
                  onClick={preventEvent}
                />
              </div>

              {/* Create Maps Dropdown - Right Box */}
              {isSelected && (
                <div className="flex justify-start">
                  <div className="relative">
                    <button
                      className={`${styles.sidePanel.container} w-[140px] h-[34px] px-2 flex items-center justify-between`}
                      onClick={(e) => {
                        preventEvent(e);
                        setIsDropdownOpen(!isDropdownOpen);
                      }}
                    >
                      <span className={styles.sidePanel.label}>Analyze Image</span>
                      <svg
                        className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isDropdownOpen && (
                      <div className={`${styles.sidePanel.container} absolute left-0 top-[34px] mt-1 shadow-lg z-50 w-[140px]`}>
                        <button
                          className={`w-full px-3 py-1.5 text-left ${styles.sidePanel.label} hover:bg-neutral-100 dark:hover:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700`}
                          onClick={async (e) => {
                            preventEvent(e);
                            setIsDropdownOpen(false);
                            const newDepthShape: Shape = {
                              id: Math.random().toString(36).substr(2, 9),
                              type: "depth",
                              position: {
                                x: shape.position.x + shape.width + 20,
                                y: shape.position.y,
                              },
                              width: shape.width,
                              height: shape.height,
                              rotation: 0,
                              isUploading: false,
                              isEditing: false,
                              color: "transparent",
                              sourceImageId: shape.id,
                              showDepth: true,
                              showEdges: false,
                              showPose: false,
                              depthStrength: 0.5,
                              edgesStrength: 0.5,
                              poseStrength: 0.5,
                            };
                            addShape(newDepthShape);
                            setSelectedShapes([newDepthShape.id]);
                            try {
                              await generatePreprocessedImage(shape.id, "depth");
                              const subscription = supabase
                                .channel(`preprocessing_${shape.id}_depth`)
                                .on(
                                  "postgres_changes",
                                  {
                                    event: "UPDATE",
                                    schema: "public",
                                    table: "preprocessed_images",
                                    filter: `shapeId=eq.${shape.id}`,
                                  },
                                  (payload) => {
                                    if (payload.new.status === "completed" && payload.new.processType === "depth") {
                                      updateShape(newDepthShape.id, {
                                        depthMapUrl: payload.new.depthUrl,
                                        depthPreviewUrl: payload.new.depthUrl,
                                      });
                                      useStore.setState((state) => ({
                                        preprocessingStates: {
                                          ...state.preprocessingStates,
                                          [shape.id]: {
                                            ...state.preprocessingStates[shape.id],
                                            depth: false,
                                          },
                                        },
                                      }));
                                      subscription.unsubscribe();
                                    }
                                  }
                                )
                                .subscribe();
                            } catch (error) {
                              console.error("Failed to generate depth map:", {
                                error,
                                shapeId: shape.id,
                                processType: "depth",
                                message: error instanceof Error ? error.message : "Unknown error"
                              });
                            }
                          }}
                        >
                          Depth Reference
                        </button>
                        <button
                          className={`w-full px-3 py-1.5 text-left ${styles.sidePanel.label} hover:bg-neutral-100 dark:hover:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700`}
                          onClick={async (e) => {
                            preventEvent(e);
                            setIsDropdownOpen(false);
                            const newEdgesShape: Shape = {
                              id: Math.random().toString(36).substr(2, 9),
                              type: "edges",
                              position: {
                                x: shape.position.x + shape.width + 20,
                                y: shape.position.y,
                              },
                              width: shape.width,
                              height: shape.height,
                              rotation: 0,
                              isUploading: false,
                              isEditing: false,
                              color: "transparent",
                              sourceImageId: shape.id,
                              showDepth: false,
                              showEdges: true,
                              showPose: false,
                              depthStrength: 0.5,
                              edgesStrength: 0.5,
                              poseStrength: 0.5,
                            };
                            addShape(newEdgesShape);
                            setSelectedShapes([newEdgesShape.id]);
                            try {
                              await generatePreprocessedImage(shape.id, "edge");
                              const subscription = supabase
                                .channel(`preprocessing_${shape.id}_edge`)
                                .on(
                                  "postgres_changes",
                                  {
                                    event: "UPDATE",
                                    schema: "public",
                                    table: "preprocessed_images",
                                    filter: `shapeId=eq.${shape.id}`,
                                  },
                                  (payload) => {
                                    if (payload.new.status === "completed" && payload.new.processType === "edge") {
                                      updateShape(newEdgesShape.id, {
                                        edgeMapUrl: payload.new.edgeUrl,
                                        edgePreviewUrl: payload.new.edgeUrl,
                                      });
                                      useStore.setState((state) => ({
                                        preprocessingStates: {
                                          ...state.preprocessingStates,
                                          [shape.id]: {
                                            ...state.preprocessingStates[shape.id],
                                            edge: false,
                                          },
                                        },
                                      }));
                                      subscription.unsubscribe();
                                    }
                                  }
                                )
                                .subscribe();
                            } catch (error) {
                              console.error("Failed to generate edge map:", error);
                            }
                          }}
                        >
                          Edge Reference
                        </button>
                        <button
                          className={`w-full px-3 py-1.5 text-left ${styles.sidePanel.label} hover:bg-neutral-100 dark:hover:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700`}
                          onClick={async (e) => {
                            preventEvent(e);
                            setIsDropdownOpen(false);
                            const newPoseShape: Shape = {
                              id: Math.random().toString(36).substr(2, 9),
                              type: "pose",
                              position: {
                                x: shape.position.x + shape.width + 20,
                                y: shape.position.y,
                              },
                              width: shape.width,
                              height: shape.height,
                              rotation: 0,
                              isUploading: false,
                              isEditing: false,
                              color: "transparent",
                              sourceImageId: shape.id,
                              showDepth: false,
                              showEdges: false,
                              showPose: true,
                              depthStrength: 0.5,
                              edgesStrength: 0.5,
                              poseStrength: 0.5,
                            };
                            addShape(newPoseShape);
                            setSelectedShapes([newPoseShape.id]);
                            try {
                              await generatePreprocessedImage(shape.id, "pose");
                              const subscription = supabase
                                .channel(`preprocessing_${shape.id}_pose`)
                                .on(
                                  "postgres_changes",
                                  {
                                    event: "UPDATE",
                                    schema: "public",
                                    table: "preprocessed_images",
                                    filter: `shapeId=eq.${shape.id}`,
                                  },
                                  (payload) => {
                                    if (payload.new.status === "completed" && payload.new.processType === "pose") {
                                      updateShape(newPoseShape.id, {
                                        poseMapUrl: payload.new.poseUrl,
                                        posePreviewUrl: payload.new.poseUrl,
                                      });
                                      useStore.setState((state) => ({
                                        preprocessingStates: {
                                          ...state.preprocessingStates,
                                          [shape.id]: {
                                            ...state.preprocessingStates[shape.id],
                                            pose: false,
                                          },
                                        },
                                      }));
                                      subscription.unsubscribe();
                                    }
                                  }
                                )
                                .subscribe();
                            } catch (error) {
                              console.error("Failed to generate pose map:", error);
                            }
                          }}
                        >
                          Pose Reference
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
                  updateShape(shape.id, {
                    content: randomPrompt,
                    isEditing: true,
                  });
                  setSelectedShapes([shape.id]);
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
                      // Single update for current shape
                      updateShape(shape.id, {
                        isTextPrompt: checked,
                        isNegativePrompt: checked ? false : shape.isNegativePrompt,
                        color: checked ? "var(--sticky-green)" : (shape.isNegativePrompt ? "var(--sticky-red)" : "var(--sticky-yellow)"),
                        // Keep the existing strength value, or set to default if none exists
                        textPromptStrength: shape.textPromptStrength || 8
                      });
                      
                      // Set pending updates for other shapes
                      setPendingUpdates({ id: shape.id, isChecked: checked, isTextPrompt: true });
                      
                      // Keep the shape selected
                      setSelectedShapes([shape.id]);
                    }}
                    label="Text Prompt"
                  />
                </div>
              </Tooltip>

              {shape.isTextPrompt && (
                <div className="px-2">
                  <SmallSlider
                    value={shape.textPromptStrength || 8}
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
                      // Single update for current shape
                      updateShape(shape.id, {
                        isNegativePrompt: checked,
                        isTextPrompt: checked ? false : shape.isTextPrompt,
                        color: checked ? "var(--sticky-red)" : (shape.isTextPrompt ? "var(--sticky-green)" : "var(--sticky-yellow)")
                      });
                      
                      // Set pending updates for other shapes
                      setPendingUpdates({ id: shape.id, isChecked: checked, isNegativePrompt: true });
                      
                      // Keep the shape selected
                      setSelectedShapes([shape.id]);
                    }}
                    label="Negative Prompt"
                  />
                </div>
              </Tooltip>
            </div>
          </div>
        )}
      </div>

      {/* Move depth controls outside the inset-0 container */}
      {shape.type === "depth" && (isSelected || shape.showDepth) && (
        <div
          className="absolute left-2 top-full mt-1"
          data-shape-control="true"
          style={{ zIndex: 1000, pointerEvents: "all" }}
        >
          <EnableReferencePanel
            id={`enable-depth-${shape.id}`}
            label="Use Depth Reference"
            checked={shape.showDepth || false}
            onToggleChange={(checked: boolean) => {
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
        >
          <EnableReferencePanel
            id={`enable-edges-${shape.id}`}
            label="Use Edge Reference"
            checked={shape.showEdges || false}
            onToggleChange={(checked: boolean) => {
              updateShape(shape.id, { showEdges: checked });
              setSelectedShapes([shape.id]);
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
        >
          <EnableReferencePanel
            id={`enable-pose-${shape.id}`}
            label="Use Pose Reference"
            checked={shape.showPose || false}
            onToggleChange={(checked: boolean) => {
              updateShape(shape.id, { showPose: checked });
              setSelectedShapes([shape.id]);
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

      {shape.type === "group" && (
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
              id={`group-enabled-${shape.id}`}
              checked={shape.groupEnabled || false}
              onChange={(checked) => {
                // Get all shapes in this group
                const groupedShapes = shapes.filter(s => s.groupId === shape.id);
                
                if (!checked) {
                  // When disabling the group, store the current state of sticky notes
                  const stickyStates: { [shapeId: string]: { isTextPrompt: boolean; isNegativePrompt: boolean } } = {};
                  groupedShapes.forEach(groupedShape => {
                    if (groupedShape.type === "sticky") {
                      stickyStates[groupedShape.id] = {
                        isTextPrompt: groupedShape.isTextPrompt || false,
                        isNegativePrompt: groupedShape.isNegativePrompt || false
                      };
                    }
                  });
                  
                  // Update the group's enabled state and store sticky states
                  updateShape(shape.id, { 
                    groupEnabled: false,
                    stickyStates
                  });
                } else {
                  // When enabling the group, restore from stored states
                  updateShape(shape.id, { groupEnabled: true });
                }
                
                // Toggle all enabled properties of shapes in the group
                groupedShapes.forEach(groupedShape => {
                  const updates: Partial<Shape> = {};
                  
                  if (checked) {
                    // When enabling the group, restore all toggles to their previous state
                    if (groupedShape.type === "image" || groupedShape.type === "sketchpad") {
                      updates.showImagePrompt = true;
                    }
                    if (groupedShape.type === "sticky") {
                      // Restore from stored state
                      const storedState = shape.stickyStates?.[groupedShape.id];
                      if (storedState) {
                        if (storedState.isTextPrompt) {
                          updates.isTextPrompt = true;
                          updates.isNegativePrompt = false;
                          updates.color = "var(--sticky-green)";
                        } else if (storedState.isNegativePrompt) {
                          updates.isTextPrompt = false;
                          updates.isNegativePrompt = true;
                          updates.color = "var(--sticky-red)";
                        } else {
                          updates.isTextPrompt = false;
                          updates.isNegativePrompt = false;
                          updates.color = "var(--sticky-yellow)";
                        }
                      }
                    }
                    if (groupedShape.type === "diffusionSettings") {
                      updates.useSettings = true;
                    }
                  }
                  // When disabling the group, turn off all toggles
                  if (groupedShape.type === "image" || groupedShape.type === "sketchpad") {
                    updates.showImagePrompt = false;
                  }
                  if (groupedShape.type === "sticky") {
                    updates.isTextPrompt = false;
                    updates.isNegativePrompt = false;
                    updates.color = "var(--sticky-yellow)";
                  }
                  if (groupedShape.type === "diffusionSettings") {
                    updates.useSettings = false;
                  }
                  
                  // Toggle all show properties
                  updates.showDepth = checked;
                  updates.showEdges = checked;
                  updates.showPose = checked;
                  updates.showContent = checked;
                  updates.showSketch = checked;
                  
                  // Only update if there are properties to toggle
                  if (Object.keys(updates).length > 0) {
                    updateShape(groupedShape.id, updates);
                  }
                });
              }}
              label="Enable"
            />
          </div>
        </div>
      )}
    </>
  );
}
