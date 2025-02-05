import { useState, useEffect, useRef } from "react";
import { useStore } from "../../store";
import { Shape } from "../../types";
import { ImageActionDropdown } from "./ImageActionDropdown";
import { generatePrompt } from "../../utils/prompt-generator";
import { Tooltip } from "../shared/Tooltip";
import { getControlDescription, ControlType } from "../../utils/tooltips";
import { ThreeJSShape } from "./shapetypes/ThreeJSShape";
import { Brush, Eraser, Trash2 } from "lucide-react";
import { useThemeClass } from '../../styles/useThemeClass';

interface ShapeControlsProps {
  shape: Shape;
  isSelected: boolean;
  isEditing: boolean;
  handleResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void;
}

interface ThreeJSShapeRef {
  exportToGLTF: () => void;
}

export function ShapeControls({
  shape,
  isSelected,
  handleResizeStart,
}: ShapeControlsProps) {

  const styles = {
    controls: {
      panel: useThemeClass(['shape', 'controls', 'panel']),
      group: useThemeClass(['shape', 'controls', 'group']),
      checkbox: useThemeClass(['shape', 'controls', 'checkbox']),
      label: useThemeClass(['shape', 'controls', 'label']),
      slider: useThemeClass(['shape', 'controls', 'slider']),
      tooltip: useThemeClass(['shape', 'controls', 'tooltip']),
      button: useThemeClass(['shape', 'controls', 'button']),
      buttonActive: useThemeClass(['shape', 'controls', 'buttonActive'])
    },
    sidePanel: {
      container: useThemeClass(['shape', 'sidePanel', 'container']),
      group: useThemeClass(['shape', 'sidePanel', 'group']),
      checkbox: useThemeClass(['shape', 'sidePanel', 'checkbox']),
      label: useThemeClass(['shape', 'sidePanel', 'label'])
    },
    resizeHandle: useThemeClass(['shape', 'resizeHandle']),
    colorPicker: useThemeClass(['shape', 'colorPicker']),
    newOverlay: {
      container: useThemeClass(['shape', 'newOverlay', 'container']),
      text: useThemeClass(['shape', 'newOverlay', 'text'])
    }
  };


  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { sendToBack, sendToFront, sendBackward, sendForward, deleteShape } =
    useStore();
  const threeJSRef = useRef<ThreeJSShapeRef>(null);
  const { tool, setTool, setCurrentColor } = useStore((state) => ({
    tool: state.tool,
    setTool: state.setTool,
    currentColor: state.currentColor,
    setCurrentColor: state.setCurrentColor,
    brushTexture: state.brushTexture,
    setBrushTexture: state.setBrushTexture,
    brushSize: state.brushSize,
    setBrushSize: state.setBrushSize,
    brushOpacity: state.brushOpacity,
    setBrushOpacity: state.setBrushOpacity,
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
  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (shape.imageUrl) {
      try {
        const response = await fetch(shape.imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `image-${shape.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Download failed:", error);
      }
    }
    setIsDropdownOpen(false);
  };

  const handleSelectSubject = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (shape.imageUrl) {
      try {
        await handleGenerateSubject(shape);
      } catch (error) {
        console.error("Select subject failed:", error);
      }
    }
    setIsDropdownOpen(false);
  };

  const handleCrop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    updateShape(shape.id, { isImageEditing: true });
    setIsDropdownOpen(false);
  };

 
  const { updateShape, shapes, setSelectedShapes,  addShape} = useStore();

  const handleGenerateSubject = useStore(
    (state) => state.handleGenerateSubject
  );

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
  const remixProcessing = useStore(
    (state) => state.preprocessingStates[shape.id]?.remix
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
      type: "Remix",
      preview: shape.remixPreviewUrl,
      showKey: "showRemix",
      strengthKey: "remixStrength",
      isProcessing: remixProcessing,
      processType: "remix",
      preprocessor: "Remix",
    },
  ];
  const showManipulationControls = isSelected;
  const anyCheckboxChecked =
    shape.showDepth ||
    shape.showEdges ||
    shape.showContent ||
    shape.showPose ||
    shape.showPrompt ||
    shape.showNegativePrompt ||
    shape.showSketch ||
    shape.showRemix;
  const showControlPanel =
    isSelected ||
    anyCheckboxChecked ||
    shape.useSettings ||
    (shape.type === "sketchpad" && (tool === "brush" || tool === "eraser"));

  if (!showControlPanel) return null;

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
      updateShape(shape.id, {
        [control.showKey]: isChecked,
        sketchPreviewUrl: isChecked ? shape.imageUrl : undefined,
      });
      return;
    }

    // For remix control, set remixPreviewUrl
    if (control.processType === "remix") {
      updateShape(shape.id, {
        [control.showKey]: isChecked,
        remixPreviewUrl: isChecked ? shape.imageUrl : undefined,
      });
      return;
    }

    // Rest of the existing handleCheckboxChange logic...
    const previewUrl = shape[`${control.processType}PreviewUrl` as keyof Shape];
    updateShape(shape.id, { [control.showKey]: isChecked });

    if (control.processType !== "remix") {
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
          control.processType as "depth" | "edge" | "pose" | "sketch" | "remix"
        );
      } catch (error) {
        console.error("Failed to generate preprocessed image:", error);
        updateShape(shape.id, { [control.showKey]: false });
      }
    }
  };

  if (!showControlPanel && !shape.isNew) return null;

return (
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
      }}
    >
      {shape.type === "sticky" && shape.isNew && (
        <div className={styles.newOverlay.container}>
          <div className={styles.newOverlay.text}>
            Double-click to edit
          </div>
        </div>
      )}

      {(shape.type === "image" || shape.type === "sketchpad") &&
        showControlPanel && (
          <div className={styles.controls.panel}>
            {controls
              .filter((control) => control.processType)
              .map((control) => (
                <div key={control.type} className={styles.controls.group}>
                  <div className={`group relative py-0.5 ${
                    control.showKey && shape[control.showKey as keyof Shape]
                      ? "w-max"
                      : "w-max"
                  }`}>
                    {control.showKey && (
                      <Tooltip content={
                        <div>
                          <h4 className="font-medium mb-1">{control.type}</h4>
                          <p>{getControlDescription(control.type as ControlType)}</p>
                        </div>
                      }>
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
                          className={`mt-0.5 pl-1 pr-2 relative ${
                            shape[control.showKey as keyof Shape]
                              ? "block"
                              : "hidden"
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="relative">
                            {isHovering && (
                              <div className={styles.controls.tooltip}>
                                {(shape[control.strengthKey as keyof Shape] as number)?.toFixed(2) ?? "0.25"}
                              </div>
                            )}
                            <input
                              type="range"
                              min="0.05"
                              max="1.00"
                              step="0.05"
                              value={
                                typeof shape[control.strengthKey as keyof Shape] === "number"
                                  ? (shape[control.strengthKey as keyof Shape] as number)
                                  : 0.25
                              }
                              onMouseEnter={() => setIsHovering(true)}
                              onMouseLeave={() => setIsHovering(false)}
                              onChange={(e) => {
                                updateShape(shape.id, {
                                  [control.strengthKey]: parseFloat(e.target.value),
                                });
                              }}
                              className={styles.controls.slider}
                              style={{ pointerEvents: "all" }}
                            />
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
          style={{ zIndex: 101, pointerEvents: "all" }}
        >
          <ImageActionDropdown
            shape={shape}
            isDropdownOpen={isDropdownOpen}
            setIsDropdownOpen={setIsDropdownOpen}
            onSelectSubject={handleSelectSubject}
            onCrop={handleCrop}
            onDownload={handleDownload}
            sendToBack={() => sendToBack()}
            sendToFront={() => sendToFront()}
            sendBackward={() => sendBackward()}
            sendForward={() => sendForward()}
            deleteShape={() => deleteShape(shape.id)}
          />
        </div>
      )}

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
        shape.type !== "3d" && (
          <input
            type="color"
            value={shape.color}
            onChange={(e) => updateShape(shape.id, { color: e.target.value })}
            className={styles.colorPicker}
            style={{ zIndex: 101, pointerEvents: "all" }}
          />
      )}

      {shape.type === "diffusionSettings" && (
        <div className={styles.sidePanel.container} style={{ zIndex: 101, pointerEvents: "all", width: "160px" }}>
          <div className={styles.sidePanel.group}>
            <input
              type="checkbox"
              id={`use-settings-${shape.id}`}
              checked={shape.useSettings || false}
              onChange={(e) => {
                if (e.target.checked) {
                  shapes.forEach((otherShape) => {
                    if (
                      otherShape.type === "diffusionSettings" &&
                      otherShape.id !== shape.id
                    ) {
                      updateShape(otherShape.id, { useSettings: false });
                    }
                  });
                }
                updateShape(shape.id, { useSettings: e.target.checked });
              }}
              className={styles.sidePanel.checkbox}
            />
            <label
              htmlFor={`use-settings-${shape.id}`}
              className={styles.sidePanel.label}
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
      pointerEvents: "auto" // Ensure pointer events work
    }}
  >
    <Tooltip content="Add a random text prompt" side="bottom">
      <button
        type="button"
        className="w-6 h-6 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center justify-center shadow-sm action-dropdown"
        style={{ 
          pointerEvents: "all",
          position: "relative" // Ensure proper stacking context
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
            isEditing: true
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
  >        <div className="flex flex-col gap-1.5">
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
                    if (e.target.checked) {
                      if (shape.showNegativePrompt) {
                        updateShape(shape.id, { showNegativePrompt: false });
                      }
                      shapes.forEach((otherShape) => {
                        if (
                          otherShape.type === "sticky" &&
                          otherShape.showPrompt
                        ) {
                          updateShape(otherShape.id, {
                            showPrompt: false,
                            color: otherShape.showNegativePrompt
                              ? "#ffcccb"
                              : "#fff9c4",
                          });
                        }
                      });
                      updateShape(shape.id, {
                        showPrompt: true,
                        color: "#90EE90",
                      });
                    } else {
                      updateShape(shape.id, {
                        showPrompt: false,
                        color: shape.showNegativePrompt ? "#ffcccb" : "#fff9c4",
                      });
                    }
                  }}
                  className={styles.sidePanel.checkbox}
                />
                <label
                  htmlFor={`prompt-${shape.id}`}
                  className={styles.sidePanel.label}
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
                            color: otherShape.showPrompt
                              ? "#90EE90"
                              : "#fff9c4",
                          });
                        }
                      });
                      updateShape(shape.id, {
                        showNegativePrompt: true,
                        color: "#ffcccb",
                      });
                    } else {
                      updateShape(shape.id, {
                        showNegativePrompt: false,
                        color: shape.showPrompt ? "#90EE90" : "#fff9c4",
                      });
                    }
                  }}
                  className={styles.sidePanel.checkbox}
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
  <div>
    <ThreeJSShape ref={threeJSRef} shape={shape} />
    <Tooltip content="Download 3D Scene" side="bottom">
      <div
        className={`absolute -left-0 -bottom-8 w-6 h-6 ${styles.controls.button}`}
        style={{ zIndex: 101, pointerEvents: "all" }}
        onClick={(e) => {
          e.stopPropagation();
          if (threeJSRef.current) {
            threeJSRef.current.exportToGLTF();
          }
        }}
      >
        // ... svg icon
      </div>
    </Tooltip>
  </div>
)}

      {shape.type === "sketchpad" && (
        <>
          <div
            className="absolute left-3 -bottom-9 flex gap-2"
            style={{ zIndex: 101, pointerEvents: "all" }}
          >
            <Tooltip content="Brush Tool" side="bottom">
              <button
                onClick={() => {
                  setTool("brush");
                  setCurrentColor("#ffffff");
                }}
                className={`${styles.controls.button} ${
                  tool === "brush" ? styles.controls.buttonActive : ""
                }`}
              >
                <Brush className="w-5 h-5" />
              </button>
            </Tooltip>
            <Tooltip content="Eraser Tool" side="bottom">
              <button
                onClick={() => {
                  setTool("eraser");
                  setCurrentColor("#000000");
                }}
                className={`${styles.controls.button} ${
                  tool === "eraser" ? styles.controls.buttonActive : ""
                }`}
              >
                <Eraser className="w-5 h-5" />
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
                    color: "#ffffff",
                    rotation: shape.rotation,
                    locked: true,
                    isUploading: false,
                    isEditing: false,
                    model: "",
                    useSettings: false,
                    depthStrength: 0.25,
                    edgesStrength: 0.25,
                    contentStrength: 0.25,
                    poseStrength: 0.25,
                    sketchStrength: 0.25,
                    remixStrength: 0.25,
                    canvasData: undefined,
                    showSketch: true
                  };
                  deleteShape(shape.id);
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
    </div>
  );
}