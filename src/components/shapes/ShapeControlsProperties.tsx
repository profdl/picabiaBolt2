import { useState, useEffect } from "react";
import { useStore } from "../../store";
import { Shape } from "../../types";
import { generatePrompt } from "../../utils/prompt-generator";
import { Tooltip } from "../shared/Tooltip";
import { getControlDescription, ControlType } from "../../utils/tooltips";
import { Brush, Trash2, Wand } from "lucide-react";
import { useThemeClass } from "../../styles/useThemeClass";

interface ShapeControlsProps {
  shape: Shape;
  isSelected: boolean;
  handleResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void;
  threeJSRef?: React.RefObject<ThreeJSShapeRef>;
}

interface ThreeJSShapeRef {
  exportToGLTF: () => void;
}

export function ShapeControlsProperties({
  shape,
  isSelected,
  handleResizeStart,
  threeJSRef,
}: ShapeControlsProps) {
  const styles = {
    controls: {
      panel: useThemeClass(["shape", "controls", "panel"]),
      group: useThemeClass(["shape", "controls", "group"]),
      checkbox: useThemeClass(["forms", "checkbox"]), // Update to use forms.checkbox directly
      label: useThemeClass(["shape", "controls", "label"]),
      slider: useThemeClass(["shape", "controls", "slider"]),
      tooltip: useThemeClass(["shape", "controls", "tooltip"]),
      button: useThemeClass(["shape", "controls", "button"]),
      buttonActive: useThemeClass(["shape", "controls", "buttonActive"]),
    },
    sidePanel: {
      container: useThemeClass(["shape", "sidePanel", "container"]),
      group: useThemeClass(["shape", "sidePanel", "group"]),
      checkbox: useThemeClass(["forms", "checkbox"]), // Update to use forms.checkbox directly
      label: useThemeClass(["shape", "sidePanel", "label"]),
    },
    resizeHandle: useThemeClass(["shape", "resizeHandle"]),
    colorPicker: useThemeClass(["shape", "colorPicker"]),
  };

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { tool, setTool } = useStore((state) => ({
    tool: state.tool,
    setTool: state.setTool,
  }));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside the dropdown
      if (isDropdownOpen && !target.closest(".action-dropdown")) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  // Action handlers



  const { updateShape, shapes, setSelectedShapes, addShape } = useStore();


  const generatePreprocessedImage = useStore(
    (state) => state.generatePreprocessedImage
  );
  const depthProcessing = useStore(
    (state) => state.preprocessingStates[shape.id]?.depth
  );
  const edgeProcessing = useStore(
    (state) => state.preprocessingStates[shape.id]?.edge
  );
  const poseProcessing = useStore(
    (state) => state.preprocessingStates[shape.id]?.pose
  );
  const sketchProcessing = useStore(
    (state) => state.preprocessingStates[shape.id]?.sketch
  );
  const imagePromptProcessing = useStore(
    (state) => state.preprocessingStates[shape.id]?.imagePrompt
  );

  const [isHovering, setIsHovering] = useState(false);
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
      type: "Image",
      preview: shape.imageUrl,
      showKey: "showImagePrompt",
      strengthKey: "imagePromptStrength",
      isProcessing: imagePromptProcessing,
      processType: "image",
      preprocessor: "Image",
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
    shape.showImagePrompt ||
    (shape.type === "diffusionSettings" && shape.useSettings); 

    const showControlPanel = isSelected || anyCheckboxChecked;
    const showManipulationControls = isSelected;
  
    if (!showControlPanel && !shape.isNew) return null;
  

  const handleCheckboxChange = async (
    control: (typeof controls)[0],
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    e.stopPropagation();
    if (!control.showKey || !control.processType) return;

    const isChecked = e.target.checked;

    if (isChecked) {
      setSelectedShapes([shape.id]);
    }

    // For sketch control, use the original image as preview
    if (control.processType === "sketch") {
      // Uncheck sketch on all other shapes first
      shapes.forEach((otherShape) => {
        if (
          otherShape.id !== shape.id &&
          (otherShape.type === "image" || otherShape.type === "sketchpad")
        ) {
          if (otherShape.showSketch) {
            updateShape(otherShape.id, {
              showSketch: false,
              sketchPreviewUrl: undefined,
            });
          }
        }
      });

      // Then update current shape
      updateShape(shape.id, {
        [control.showKey]: isChecked,
        sketchPreviewUrl: isChecked ? shape.imageUrl : undefined,
      });
      return;
    }

    // For remix control, set remixPreviewUrl
    if (control.processType === "image") {
      updateShape(shape.id, {
        [control.showKey]: isChecked,
      });
      return;
    }

    // Rest of the existing handleCheckboxChange logic...
    const previewUrl = shape[`${control.processType}PreviewUrl` as keyof Shape];
    updateShape(shape.id, { [control.showKey]: isChecked });

    if (control.processType !== "image") {
      shapes.forEach((otherShape) => {
        if (otherShape.id !== shape.id && otherShape.type === "image") {
          const showKey = control.showKey as keyof Shape;
          if (otherShape[showKey]) {
            updateShape(otherShape.id, { [control.showKey]: false });
          }
        }
      });
    }

    // Generate preview if needed
    if (isChecked && !previewUrl) {
      try {
        await generatePreprocessedImage(
          shape.id,
          control.processType as "depth" | "edge" | "pose" | "sketch" | "imagePrompt"
        );
      } catch (error) {
        console.error("Failed to generate preprocessed image:", error);
        updateShape(shape.id, { [control.showKey]: false });
      }
    }
  };

  if (!showControlPanel && !shape.isNew) return null;

  return (
    <>
      <div
        className="absolute inset-0"
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
        {/* Only show resize handle when selected */}
        {showManipulationControls && (
          <div
            className={styles.resizeHandle}
            style={{ zIndex: 101, pointerEvents: "all" }}
            onMouseDown={handleResizeStart}
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
              onChange={(e) => updateShape(shape.id, { color: e.target.value })}
              className={styles.colorPicker}
              style={{ zIndex: 101, pointerEvents: "all" }}
            />
          )}
      </div>

      {/* Move image controls outside the main container */}
      {(shape.type === "image" || shape.type === "sketchpad") && (
        <div 
          className={`absolute left-2 top-full mt-1 ${styles.controls.panel}`}
          style={{ zIndex: 1000, pointerEvents: "all" }}
        >
          {(isSelected
            ? controls.filter((control) => control.processType)
            : controls.filter(
                (control) =>
                  control.showKey && shape[control.showKey as keyof Shape]
              )
          ).map((control) => (
            <div key={control.type} className={styles.controls.group}>
              <div className="group relative py-0.5 w-max">
                {control.showKey && (
                  <Tooltip
                    content={
                      <div>
                        <h4 className="font-medium mb-1">{control.type}</h4>
                        <p>
                          {getControlDescription(control.type as ControlType)}
                        </p>
                      </div>
                    }
                  >
                    <div className={styles.sidePanel.group}>
                      <input
                        type="checkbox"
                        checked={Boolean(shape[control.showKey as keyof Shape])}
                        onChange={(e) => handleCheckboxChange(control, e)}
                        className={styles.controls.checkbox}
                        style={{ pointerEvents: "all" }}
                      />
                      <span className={styles.controls.label}>
                        {control.type}
                      </span>
                    </div>
                  </Tooltip>
                )}
                {control.strengthKey &&
                  control.showKey &&
                  shape[control.showKey as keyof Shape] && (
                    <div
                      className="mt-0.5 pl-4 pr-2 relative block"
                      onClick={(e) => e.stopPropagation()}
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
                            onChange={(e) => {
                              updateShape(shape.id, {
                                [control.strengthKey]: parseFloat(
                                  e.target.value
                                ),
                              });
                            }}
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

      {/* Rest of the controls */}
      {shape.type === "image" && shape.imageUrl && isSelected && (
        <div
          className="absolute -left-0 -bottom-7 action-dropdown"
          style={{ zIndex: 101, pointerEvents: "all" }}
        >
         
        </div>
      )}

      {shape.type === "diffusionSettings" && (
        <div
          className={`absolute left-1/2 -bottom-10 transform -translate-x-1/2 ${styles.sidePanel.container}`}
          style={{ zIndex: 101, pointerEvents: "all", width: "160px" }}
          data-controls-panel={shape.id}
        >
          <div className={styles.sidePanel.group}>
            <input
              type="checkbox"
              id={`use-settings-${shape.id}`}
              checked={shape.useSettings || false}
              onChange={(e) => {
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
              className={styles.controls.checkbox}
            />
            <label
              htmlFor={`use-settings-${shape.id}`}
              className={`${styles.sidePanel.label} whitespace-nowrap`}
            >
              Use Settings
            </label>
          </div>
        </div>
      )}
      {shape.type === "sticky" && isSelected && (
        <div
          className="absolute -left-0 -bottom-7"
          style={{
            zIndex: 1000, // Increased z-index
            pointerEvents: "auto", // Ensure pointer events work
          }}
        >
          <Tooltip content="Add a random text prompt" side="bottom">
            <button
              type="button"
              className="w-6 h-6 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center justify-center shadow-sm action-dropdown"
              style={{
                pointerEvents: "all",
                position: "relative", // Ensure proper stacking context
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const randomPrompt = generatePrompt();
                updateShape(shape.id, {
                  content: randomPrompt,
                  isEditing: true,
                });
                setSelectedShapes([shape.id]);
              }}
            >
              <img
                src="/dice-outline.svg"
                alt="Random prompt"
                className="w-5 h-5 text-neutral-600 dark:text-neutral-300"
                style={{ pointerEvents: "none" }} // Prevent img from interfering with clicks
              />
            </button>
          </Tooltip>
        </div>
      )}
      {shape.type === "sticky" && (
        <div
          className={`absolute left-1/2 top-full mt-1 transform -translate-x-1/2 ${styles.sidePanel.container}`}
          style={{ zIndex: 101, pointerEvents: "all", width: "160px" }}
        >
          {" "}
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
                <input
                  type="checkbox"
                  id={`prompt-${shape.id}`}
                  checked={shape.showPrompt || false}
                  onChange={(e) => {
                    e.stopPropagation(); // Add this to prevent event bubbling
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
                  className={styles.controls.checkbox}
                  style={{ pointerEvents: "all" }} // Add this to ensure clicks are registered
                />
                <label
                  htmlFor={`prompt-${shape.id}`}
                  className={styles.sidePanel.label}
                  onClick={(e) => e.stopPropagation()} // Add this to prevent event bubbling
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
              <div className={styles.sidePanel.group}>
                <input
                  type="checkbox"
                  id={`negative-${shape.id}`}
                  checked={shape.showNegativePrompt || false}
                  onChange={(e) => {
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
                              : "var(--sticky-yellow)", // Instead of "#90EE90" : "#fff9c4"
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
                        color: shape.showPrompt ? "#90EE90" : "#fff9c4",
                      });
                    }
                  }}
                  className={styles.controls.checkbox}
                />
                <label
                  htmlFor={`negative-${shape.id}`}
                  className={styles.sidePanel.label}
                >
                  Negative Prompt
                </label>
              </div>
            </Tooltip>
          </div>
        </div>
      )}

      {shape.type === "3d" && isSelected && (
        <div
          className="absolute -left-0 -bottom-7"
          style={{
            zIndex: 101,
            pointerEvents: "all",
          }}
        >
          <Tooltip content="Download 3D Scene" side="bottom">
            <button
              type="button"
              className={`w-6 h-6 ${styles.controls.button} flex items-center justify-center`}
              onClick={(e) => {
                e.stopPropagation();
                // Call the ref's exportToGLTF method directly
                if (threeJSRef && threeJSRef.current) {
                  threeJSRef.current.exportToGLTF();
                }
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </Tooltip>
        </div>
      )}

      {shape.type === "sketchpad" && (
        <>
          <div
            className="absolute left-3 -bottom-9 flex gap-2"
            style={{ zIndex: 101, pointerEvents: "all" }}
          >
            <Tooltip content="Brush Tool (B)" side="bottom">
              <button
                onClick={() => {
                  setTool("brush");
                }}
                className={`${styles.controls.button} ${
                  tool === "brush" ? styles.controls.buttonActive : ""
                }`}
              >
                <Brush className="w-5 h-5" />
              </button>
            </Tooltip>

            <Tooltip content="Eraser Tool (E)" side="bottom">
              <button
                onClick={() => {
                  setTool("eraser");
                }}
                className={`${styles.controls.button} ${
                  tool === "eraser" ? styles.controls.buttonActive : ""
                }`}
              >
                <Wand className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>
          <div
            className="absolute right-0 -bottom-9"
            style={{ zIndex: 101, pointerEvents: "all" }}
          >
            <Tooltip content="Clear Canvas" side="bottom">
              <button
                onClick={() => {
                  const newId = Math.random().toString(36).substr(2, 9);
                  const newShape: Shape = {
                    id: newId,
                    type: "sketchpad",
                    position: shape.position,
                    width: shape.width,
                    height: shape.height,
                    color: "#000000",
                    rotation: shape.rotation,
                    isUploading: false,
                    isEditing: false,
                    model: "",
                    useSettings: false,
                    depthStrength: 0.25,
                    edgesStrength: 0.25,
                    contentStrength: 0.25,
                    poseStrength: 0.25,
                    sketchStrength: 0.25,
                    canvasData: undefined,
                    showSketch: true,
                  };
                  addShape(newShape);
                  setTool("brush");
                }}
                className={`${styles.controls.button} hover:text-neutral-700 dark:hover:text-neutral-200`}
              >
                <Trash2 className="w-4 h-5" />
              </button>
            </Tooltip>
          </div>
        </>
      )}
    </>
  );
}
