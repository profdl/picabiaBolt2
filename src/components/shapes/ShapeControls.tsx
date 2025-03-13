import { useState, useEffect } from "react";
import { useStore } from "../../store";
import { Shape } from "../../types";
import { ImageActionDropdown } from "./ImageActionDropdown";
import { generatePrompt } from "../../utils/prompt-generator";
import { Tooltip } from "../shared/Tooltip";
import { Trash2 } from "lucide-react";
import { useThemeClass } from "../../styles/useThemeClass";
import { NumberInput } from "../shared/NumberInput";
import { supabase } from "../../lib/supabase";
import { generatePreprocessedImage } from "../../utils/generate-preprocessed-image";

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
  const [isHovering, setIsHovering] = useState(false);
  const { updateShape, shapes, setSelectedShapes, updateShapes, addShape } = useStore();
  const edgeProcessing = useStore((state) => state.preprocessingStates[shape.id]?.edge);
  const poseProcessing = useStore((state) => state.preprocessingStates[shape.id]?.pose);
  const sketchProcessing = useStore((state) => state.preprocessingStates[shape.id]?.sketch);
  const remixProcessing = useStore((state) => state.preprocessingStates[shape.id]?.remix);

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
  const controls = [
    {
      type: "Original",
      preview: shape.imageUrl,
      showKey: null,
      strengthKey: null,
    },
    {
      type: "Edges",
      preview: shape.edgePreviewUrl,
      showKey: "showEdges",
      strengthKey: "edgesStrength",
      isProcessing: edgeProcessing,
      processType: "edge",
      preprocessor: "Canny",
    },
    {
      type: "Pose",
      preview: shape.posePreviewUrl,
      showKey: "showPose",
      strengthKey: "poseStrength",
      isProcessing: poseProcessing,
      processType: "pose",
      preprocessor: "OpenPose",
    },
    {
      type: "Sketch",
      preview: shape.sketchPreviewUrl,
      showKey: "showSketch",
      strengthKey: "sketchStrength",
      isProcessing: sketchProcessing,
      processType: "sketch",
      preprocessor: "Sketch",
    },
    {
      type: "Remix",
      preview: shape.remixPreviewUrl,
      showKey: "showRemix",
      strengthKey: "remixStrength",
      isProcessing: remixProcessing,
      processType: "remix",
      preprocessor: "Remix",
    },
  ];

  const anyCheckboxChecked =
    (shape.type === "depth" && shape.showDepth) ||
    (shape.type === "edges" && shape.showEdges) ||
    (shape.type === "pose" && shape.showPose) ||
    shape.showContent ||
    shape.isTextPrompt ||
    shape.isNegativePrompt ||
    shape.showSketch ||
    shape.showRemix ||
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
        {(shape.type === "image" || shape.type === "sketchpad") && isSelected && (
          <div 
            className={styles.controls.panelMod} 
            data-shape-control="true"
            onMouseDown={preventEvent}
            onClick={preventEvent}
            style={{ pointerEvents: "all", zIndex: 1000 }}
          >
            {isSelected && (
               controls.filter(
                  (control) =>
                    control.showKey && shape[control.showKey as keyof Shape]
                )
            ).map((control) => (
              <div key={control.type} className={styles.controls.group}>
                <div 
                  className="group py-0.5 w-max relative block" 
                  data-shape-control="true"
                  style={{ zIndex: 1000, pointerEvents: "all" }}
                  onMouseDown={preventEvent}
                  onClick={preventEvent}
                >
                  {control.showKey && (
                      <div 
                        className={styles.sidePanel.group}
                        data-shape-control="true"
                        onMouseDown={preventEvent}
                        onClick={preventEvent}
                      >
                        <span className={styles.controls.label}>
                          {control.type}
                        </span>
                        <span 
                          onClick={(e) => {
                            preventEvent(e);
                            console.log('trying to delete modifier');
                            updateShape(shape.id, { [control.showKey]: false });
                          }}
                          onMouseDown={preventEvent}
                        >
                          <Trash2 className="w-3 h-3"/>
                        </span>
                      </div>
                  )}
                  {control.strengthKey &&
                    control.showKey &&
                    shape[control.showKey as keyof Shape] && (
                      <div
                        className="mt-0.5 pr-2 relative block"
                        data-shape-control="true"
                        style={{ pointerEvents: "all" }}
                      >
                        <div className="relative">
                          {isHovering && (
                            <div
                              className={styles.controls.tooltip}
                              style={{
                                position: "absolute",
                                top: "-25px",
                                left: "50%",
                                transform: "translateX(-50%)",
                                whiteSpace: "nowrap",
                                pointerEvents: "none",
                                zIndex: 1000,
                              }}
                            >
                              {(
                                shape[
                                  control.strengthKey as keyof Shape
                                ] as number
                              )?.toFixed(2) ?? "0.25"}
                            </div>
                          )}
                          <div
                            className="relative"
                            style={{ height: "18px", width: "80px" }}
                          >
                            <input
                              type="range"
                              min="0.05"
                              max="1.00"
                              step="0.05"
                              value={
                                typeof shape[
                                  control.strengthKey as keyof Shape
                                ] === "number"
                                  ? (shape[
                                      control.strengthKey as keyof Shape
                                    ] as number)
                                  : 0.25
                              }
                              onMouseEnter={() => setIsHovering(true)}
                              onMouseLeave={() => setIsHovering(false)}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                e.stopPropagation();
                                updateShape(shape.id, {
                                  [control.strengthKey]: parseFloat(
                                    e.target.value
                                  ),
                                });
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                              }}
                              className={styles.controls.slider}
                              style={{
                                position: "absolute",
                                top: "50%",
                                transform: "translateY(-50%)",
                                width: "calc(100% - 8px)",
                                cursor: "pointer",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
        {shape.type === "image" && shape.imageUrl && isSelected && (
          <div
            className="absolute -left-0 -bottom-7 action-dropdown"
            data-shape-control="true"
            style={{ zIndex: 1000, pointerEvents: "all" }}
            onMouseDown={preventEvent}
            onClick={preventEvent}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">GET:</span>
              <div className="flex gap-1">
                <button
                  className="px-2 py-0.5 text-[10px] bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  onClick={async (e) => {
                    preventEvent(e);
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
                      color: "#ffffff",
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
                  DEPTH
                </button>
                <button
                  className="px-2 py-0.5 text-[10px] bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  onClick={async (e) => {
                    preventEvent(e);
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
                      color: "#ffffff",
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
                  EDGES
                </button>
                <button
                  className="px-2 py-0.5 text-[10px] bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  onClick={async (e) => {
                    preventEvent(e);
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
                      color: "#ffffff",
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
                  POSE
                </button>
              </div>
              <ImageActionDropdown
                shape={shape}
                isDropdownOpen={isDropdownOpen}
                setIsDropdownOpen={setIsDropdownOpen}
              />
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
          className={`absolute left-1/2 top-full mt-1 transform -translate-x-1/2 ${styles.sidePanel.container}`}
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
            <div className="flex items-center gap-2">
              <span className={styles.sidePanel.label}>Strength</span>
              <NumberInput
                value={shape.depthStrength || 0.5}
                onChange={(value) => {
                  updateShape(shape.id, { depthStrength: value });
                }}
                min={0.05}
                max={1.00}
                step={0.05}
                formatValue={(value) => value.toFixed(2)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edge controls */}
      {shape.type === "edges" && (isSelected || shape.showEdges) && (
        <div
          className={`absolute left-1/2 top-full mt-1 transform -translate-x-1/2 ${styles.sidePanel.container}`}
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
            <div className="flex items-center gap-2">
              <span className={styles.sidePanel.label}>Strength</span>
              <NumberInput
                value={shape.edgesStrength || 0.5}
                onChange={(value) => {
                  updateShape(shape.id, { edgesStrength: value });
                }}
                min={0.05}
                max={1.00}
                step={0.05}
                formatValue={(value) => value.toFixed(2)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Pose controls */}
      {shape.type === "pose" && (isSelected || shape.showPose) && (
        <div
          className={`absolute left-1/2 top-full mt-1 transform -translate-x-1/2 ${styles.sidePanel.container}`}
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
            <div className="flex items-center gap-2">
              <span className={styles.sidePanel.label}>Strength</span>
              <NumberInput
                value={shape.poseStrength || 0.5}
                onChange={(value) => {
                  updateShape(shape.id, { poseStrength: value });
                }}
                min={0.05}
                max={1.00}
                step={0.05}
                formatValue={(value) => value.toFixed(2)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
