import { useState, useEffect } from "react";
import { useStore } from "../../store";
import { Shape } from "../../types";
import { ImageActionDropdown } from "./ImageActionDropdown";
import { generatePrompt } from "../../utils/prompt-generator";
import { Tooltip } from "../shared/Tooltip";
import { Trash2 } from "lucide-react";
import { useThemeClass } from "../../styles/useThemeClass";

interface ShapeControlsProps {
  shape: Shape;
  isSelected: boolean;
  handleResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function ShapeControls({
  shape,
  isSelected,
  handleResizeStart,
}: ShapeControlsProps) {
  // All hooks must be at the top
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const { updateShape, shapes, setSelectedShapes } = useStore();
  const depthProcessing = useStore((state) => state.preprocessingStates[shape.id]?.depth);
  const edgeProcessing = useStore((state) => state.preprocessingStates[shape.id]?.edge);
  const poseProcessing = useStore((state) => state.preprocessingStates[shape.id]?.pose);
  const sketchProcessing = useStore((state) => state.preprocessingStates[shape.id]?.sketch);
  const remixProcessing = useStore((state) => state.preprocessingStates[shape.id]?.remix);

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
    colorPicker: useThemeClass(["shape", "colorPicker"]),
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

  // Constants and derived state
  const controls = [
    {
      type: "Original",
      preview: shape.imageUrl,
      showKey: null,
      strengthKey: null,
    },
    {
      type: "Depth",
      preview: shape.depthPreviewUrl,
      showKey: "showDepth",
      strengthKey: "depthStrength",
      isProcessing: depthProcessing,
      processType: "depth",
      preprocessor: "MiDaS",
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
    shape.showDepth ||
    shape.showEdges ||
    shape.showContent ||
    shape.showPose ||
    shape.showPrompt ||
    shape.showNegativePrompt ||
    shape.showSketch ||
    shape.showRemix ||
    (shape.type === "diffusionSettings" && shape.useSettings);

  const showControlPanel = isSelected || anyCheckboxChecked;
  const showManipulationControls = isSelected;

  // Now we can safely return early if needed
  if (!showControlPanel && !shape.isNew) return null;

  return (
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
                      onMouseDown={preventEvent}
                      onClick={preventEvent}
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
                              preventEvent(e);
                              updateShape(shape.id, {
                                [control.strengthKey]: parseFloat(
                                  e.target.value
                                ),
                              });
                            }}
                            onMouseDown={preventEvent}
                            className={styles.controls.slider}
                            style={{
                              position: "absolute",
                              top: "50%",
                              transform: "translateY(-50%)",
                              pointerEvents: "all",
                              width: "calc(100% - 8px)",
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
          <ImageActionDropdown
            shape={shape}
            isDropdownOpen={isDropdownOpen}
            setIsDropdownOpen={setIsDropdownOpen}
          />
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

      {shape.type !== "image" &&
        shape.type !== "sketchpad" &&
        shape.type !== "group" &&
        shape.type !== "sticky" &&
        shape.type !== "3d" &&
        shape.type !== "diffusionSettings" && (
          <input
            type="color"
            value={shape.color}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              preventEvent(e);
              updateShape(shape.id, { color: e.target.value });
            }}
            onMouseDown={preventEvent}
            className={styles.colorPicker}
            data-shape-control="true"
            style={{ zIndex: 1000, pointerEvents: "all" }}
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
                  checked={shape.showPrompt || false}
                  onChange={(e) => {
                    preventEvent(e);
                    const isChecked = e.target.checked;
                    if (isChecked) {
                      // Uncheck negative prompt if it's checked
                      if (shape.showNegativePrompt) {
                        updateShape(shape.id, { showNegativePrompt: false });
                      }
                      // Uncheck prompts on other sticky notes
                      shapes.forEach((otherShape) => {
                        if (
                          otherShape.id !== shape.id &&
                          otherShape.type === "sticky" &&
                          otherShape.showPrompt
                        ) {
                          updateShape(otherShape.id, {
                            showPrompt: false,
                            color: otherShape.showNegativePrompt
                              ? "var(--sticky-red)"
                              : "var(--sticky-yellow)",
                          });
                        }
                      });
                      // Update current shape
                      updateShape(shape.id, {
                        showPrompt: true,
                        color: "var(--sticky-green)",
                      });
                      // Keep the shape selected after checking the box
                      setSelectedShapes([shape.id]);
                    } else {
                      // When unchecking, just update current shape
                      updateShape(shape.id, {
                        showPrompt: false,
                        color: shape.showNegativePrompt
                          ? "var(--sticky-red)"
                          : "var(--sticky-yellow)",
                      });
                      // Keep the shape selected after unchecking the box
                      setSelectedShapes([shape.id]);
                    }
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
                  checked={shape.showNegativePrompt || false}
                  onChange={(e) => {
                    preventEvent(e);
                    if (e.target.checked) {
                      if (shape.showPrompt) {
                        updateShape(shape.id, { showPrompt: false });
                      }
                      shapes.forEach((otherShape) => {
                        if (
                          otherShape.type === "sticky" &&
                          otherShape.showNegativePrompt
                        ) {
                          updateShape(otherShape.id, {
                            showNegativePrompt: false,
                            color: shape.showPrompt
                              ? "var(--sticky-green)"
                              : "var(--sticky-yellow)",
                          });
                        }
                      });
                      updateShape(shape.id, {
                        showNegativePrompt: true,
                        color: "var(--sticky-red)",
                      });
                    } else {
                      updateShape(shape.id, {
                        showNegativePrompt: false,
                        color: shape.showPrompt ? "var(--sticky-green)" : "var(--sticky-yellow)",
                      });
                    }
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
  );
}
