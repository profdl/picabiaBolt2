import { useState, useEffect } from "react";
import { useStore } from "../../store";
import { Shape } from "../../types";
import { generatePrompt } from "../../utils/prompt-generator";
import { Tooltip } from "../shared/Tooltip";
import { useThemeClass } from "../../styles/useThemeClass";
import { supabase } from "../../lib/supabase";
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
  const [pendingUpdates, setPendingUpdates] = useState<{ id: string; isChecked: boolean; isTextPrompt: boolean } | null>(null);

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
  if (!showControlPanel && !shape.isNew) return null;

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
            className="absolute left-0 right-0 top-full mt-1 flex gap-2"
            data-shape-control="true"
            style={{ 
              zIndex: 1000, 
              pointerEvents: "all"
            }}
            onMouseDown={preventEvent}
            onClick={preventEvent}
          >
            {/* Image Prompt Controls - Left Box */}
            <div className={`${styles.sidePanel.container}`} style={{ width: "160px" }}>
              <div className="flex flex-col gap-1.5">
                <div className={styles.sidePanel.group}>
                  <input
                    type="checkbox"
                    id={`imagePrompt-${shape.id}`}
                    checked={shape.showImagePrompt || false}
                    onChange={(e) => {
                      preventEvent(e);
                      const isEnabled = e.target.checked;
                      updateShape(shape.id, { 
                        showImagePrompt: isEnabled,
                        imagePromptStrength: isEnabled ? 0.5 : undefined 
                      });
                    }}
                    className={styles.sidePanel.checkbox}
                    onMouseDown={preventEvent}
                  />
                  <label
                    htmlFor={`imagePrompt-${shape.id}`}
                    className={styles.sidePanel.label}
                    onMouseDown={preventEvent}
                  >
                    Image Prompt
                  </label>
                </div>
                <div className="flex items-center w-full">
                  <SmallSlider
                    value={shape.imagePromptStrength || 0.5}
                    onChange={(value) => {
                      updateShape(shape.id, { imagePromptStrength: value });
                    }}
                    min={0.05}
                    max={1.00}
                    step={0.05}
                    label="Strength"
                  />
                </div>
              </div>
            </div>

            {/* Create Maps Dropdown - Right Box */}
            {isSelected && (
              <div className="flex justify-end">
                <div className="relative">
                  <button
                    className={`${styles.sidePanel.container} w-[160px] h-[34px] px-2 flex items-center justify-between`}
                    onClick={(e) => {
                      preventEvent(e);
                      setIsDropdownOpen(!isDropdownOpen);
                    }}
                  >
                    <span className={styles.sidePanel.label}>Create Maps</span>
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
                    <div className={`${styles.sidePanel.container} absolute left-0 top-[34px] mt-1 shadow-lg z-50 w-[160px]`}>
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
                            console.error("Failed to generate depth map:", error);
                          }
                        }}
                      >
                        Depth Map
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
                        Edge Map
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
                        Pose Map
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
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
              <input
                type="checkbox"
                id={`use-settings-${shape.id}`}
                checked={shape.useSettings || false}
                onChange={(e) => {
                  preventEvent(e);
                  const isChecked = e.target.checked;
                  if (isChecked) {
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
                  updateShape(shape.id, { useSettings: isChecked });
                }}
                onMouseDown={preventEvent}
                className={styles.controls.checkbox}
                data-shape-control="true"
              />
              <label
                htmlFor={`use-settings-${shape.id}`}
                className={`${styles.sidePanel.label} whitespace-nowrap`}
                data-shape-control="true"
                onMouseDown={preventEvent}
                onClick={preventEvent}
              >
                Use Settings
              </label>
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
                <div 
                  className={styles.sidePanel.group}
                  data-shape-control="true"
                  onMouseDown={preventEvent}
                  onClick={preventEvent}
                >
                  <input
                    type="checkbox"
                    id={`prompt-${shape.id}`}
                    checked={shape.isTextPrompt || false}
                    onChange={(e) => {
                      preventEvent(e);
                      const isChecked = e.target.checked;
                      
                      // Single update for current shape
                      updateShape(shape.id, {
                        isTextPrompt: isChecked,
                        isNegativePrompt: isChecked ? false : shape.isNegativePrompt,
                        color: isChecked ? "var(--sticky-green)" : (shape.isNegativePrompt ? "var(--sticky-red)" : "var(--sticky-yellow)")
                      });
                      
                      // Set pending updates for other shapes
                      setPendingUpdates({ id: shape.id, isChecked, isTextPrompt: true });
                      
                      // Keep the shape selected
                      setSelectedShapes([shape.id]);
                    }}
                    onMouseDown={preventEvent}
                    className={styles.controls.checkbox}
                    data-shape-control="true"
                    style={{ pointerEvents: "all" }}
                  />
                  <label
                    htmlFor={`prompt-${shape.id}`}
                    className={styles.sidePanel.label}
                    data-shape-control="true"
                    onMouseDown={preventEvent}
                    onClick={preventEvent}
                  >
                    Text Prompt
                  </label>
                </div>
              </Tooltip>

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
                <div 
                  className={styles.sidePanel.group}
                  data-shape-control="true"
                  onMouseDown={preventEvent}
                  onClick={preventEvent}
                >
                  <input
                    type="checkbox"
                    id={`negative-${shape.id}`}
                    checked={shape.isNegativePrompt || false}
                    onChange={(e) => {
                      preventEvent(e);
                      const isChecked = e.target.checked;
                      
                      // Single update for current shape
                      updateShape(shape.id, {
                        isNegativePrompt: isChecked,
                        isTextPrompt: isChecked ? false : shape.isTextPrompt,
                        color: isChecked ? "var(--sticky-red)" : (shape.isTextPrompt ? "var(--sticky-green)" : "var(--sticky-yellow)")
                      });
                      
                      // Set pending updates for other shapes
                      setPendingUpdates({ id: shape.id, isChecked, isTextPrompt: false });
                      
                      // Keep the shape selected
                      setSelectedShapes([shape.id]);
                    }}
                    onMouseDown={preventEvent}
                    className={styles.controls.checkbox}
                    data-shape-control="true"
                    style={{ pointerEvents: "all" }}
                  />
                  <label
                    htmlFor={`negative-${shape.id}`}
                    className={styles.sidePanel.label}
                    data-shape-control="true"
                    onMouseDown={preventEvent}
                    onClick={preventEvent}
                  >
                    Negative Prompt
                  </label>
                </div>
              </Tooltip>
            </div>
          </div>
        )}
      </div>

      {/* Move depth controls outside the inset-0 container */}
      {shape.type === "depth" && (isSelected || shape.showDepth) && (
        <div
          className={`absolute left-0 top-full mt-1 ${styles.sidePanel.container}`}
          data-shape-control="true"
          style={{ 
            zIndex: 1000, 
            pointerEvents: "all", 
            width: "160px"
          }}
          onMouseDown={preventEvent}
          onClick={preventEvent}
        >
          <div className="flex flex-col gap-1.5">
            <div className={styles.sidePanel.group}>
              <input
                type="checkbox"
                id={`enable-depth-${shape.id}`}
                checked={shape.showDepth || false}
                onChange={(e) => {
                  preventEvent(e);
                  updateShape(shape.id, { showDepth: e.target.checked });
                }}
                className={styles.sidePanel.checkbox}
                onMouseDown={preventEvent}
                data-shape-control="true"
              />
              <label
                htmlFor={`enable-depth-${shape.id}`}
                className={styles.sidePanel.label}
                onMouseDown={preventEvent}
                data-shape-control="true"
              >
                Enable Depth Prompt
              </label>
            </div>
            <div className="flex items-center w-full">
              <SmallSlider
                value={shape.depthStrength || 0.5}
                onChange={(value) => {
                  updateShape(shape.id, { depthStrength: value });
                }}
                min={0.05}
                max={1.00}
                step={0.05}
                label="Strength"
              />
            </div>
          </div>
        </div>
      )}

      {/* Edge controls */}
      {shape.type === "edges" && (isSelected || shape.showEdges) && (
        <div
          className={`absolute left-0 top-full mt-1 ${styles.sidePanel.container}`}
          data-shape-control="true"
          style={{ 
            zIndex: 1000, 
            pointerEvents: "all", 
            width: "160px"
          }}
          onMouseDown={preventEvent}
          onClick={preventEvent}
        >
          <div className="flex flex-col gap-1.5">
            <div className={styles.sidePanel.group}>
              <input
                type="checkbox"
                id={`enable-edges-${shape.id}`}
                checked={shape.showEdges || false}
                onChange={(e) => {
                  preventEvent(e);
                  updateShape(shape.id, { showEdges: e.target.checked });
                  setSelectedShapes([shape.id]);
                }}
                className={styles.sidePanel.checkbox}
                onMouseDown={preventEvent}
                data-shape-control="true"
              />
              <label
                htmlFor={`enable-edges-${shape.id}`}
                className={styles.sidePanel.label}
                onMouseDown={preventEvent}
                data-shape-control="true"
              >
                Enable Edges Prompt
              </label>
            </div>
            <div className="flex items-center w-full">
              <SmallSlider
                value={shape.edgesStrength || 0.5}
                onChange={(value) => {
                  updateShape(shape.id, { edgesStrength: value });
                }}
                min={0.05}
                max={1.00}
                step={0.05}
                label="Strength"
              />
            </div>
          </div>
        </div>
      )}

      {/* Pose controls */}
      {shape.type === "pose" && (isSelected || shape.showPose) && (
        <div
          className={`absolute left-0 top-full mt-1 ${styles.sidePanel.container}`}
          data-shape-control="true"
          style={{ 
            zIndex: 1000, 
            pointerEvents: "all", 
            width: "160px"
          }}
          onMouseDown={preventEvent}
          onClick={preventEvent}
        >
          <div className="flex flex-col gap-1.5">
            <div className={styles.sidePanel.group}>
              <input
                type="checkbox"
                id={`enable-pose-${shape.id}`}
                checked={shape.showPose || false}
                onChange={(e) => {
                  preventEvent(e);
                  updateShape(shape.id, { showPose: e.target.checked });
                  setSelectedShapes([shape.id]);
                }}
                className={styles.sidePanel.checkbox}
                onMouseDown={preventEvent}
                data-shape-control="true"
              />
              <label
                htmlFor={`enable-pose-${shape.id}`}
                className={styles.sidePanel.label}
                onMouseDown={preventEvent}
                data-shape-control="true"
              >
                Enable Pose Prompt
              </label>
            </div>
            <div className="flex items-center w-full">
              <SmallSlider
                value={shape.poseStrength || 0.5}
                onChange={(value) => {
                  updateShape(shape.id, { poseStrength: value });
                }}
                min={0.05}
                max={1.00}
                step={0.05}
                label="Strength"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
