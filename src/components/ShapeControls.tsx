import { useState, useEffect, useRef } from "react";
import { useStore } from "../store";
import { Shape } from "../types";
import { ImageActionDropdown } from "./ImageActionDropdown";
import { generatePrompt } from "../utils/prompt-generator";
import { Tooltip } from "./ui/Tooltip";
import { getControlDescription, ControlType } from "../utils/tooltips";
import { ThreeJSShape } from "./shapetypes/ThreeJSShape";
import { Brush, Eraser } from "lucide-react";
import { BrushShapeSelector } from "./BrushShapeSelector";

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { sendToBack, sendToFront, sendBackward, sendForward, deleteShape } =
    useStore();
  const threeJSRef = useRef<ThreeJSShapeRef>(null);
  const {
    tool,
    setTool,
    setCurrentColor,
    brushTexture,
    setBrushTexture,
    brushSize,
    setBrushSize,
    brushOpacity,
    setBrushOpacity,
  } = useStore((state) => ({
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

  const { updateShape, shapes, setSelectedShapes } = useStore();

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
  const scribbleProcessing = useStore(
    (state) => state.preprocessingStates[shape.id]?.scribble
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
      type: "Scribble",
      preview: shape.scribblePreviewUrl,
      showKey: "showScribble",
      strengthKey: "scribbleStrength",
      isProcessing: scribbleProcessing,
      processType: "scribble",
      preprocessor: "Scribble",
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
    shape.showScribble ||
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

    // For scribble control, use the original image as preview
    if (control.processType === "scribble") {
      updateShape(shape.id, {
        [control.showKey]: isChecked,
        scribblePreviewUrl: isChecked ? shape.imageUrl : undefined,
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
          control.processType as
            | "depth"
            | "edge"
            | "pose"
            | "scribble"
            | "remix"
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
              border: "2px solid #3b82f6", // Blue border matching other selected shapes
              borderRadius: "4px",
            }
          : {}),
      }}
    >
      {" "}
      {/* New Sticky Note Overlay Message */}
      {shape.type === "sticky" && shape.isNew && (
        <div
          className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white/90 px-2 py-1 rounded-md shadow-sm"
          style={{ pointerEvents: "none" }}
        >
          <div className="text-sm text-gray-600 whitespace-nowrap">
            Double-click to edit
          </div>
        </div>
      )}
      {/* Side Controls Panel */}
      {(shape.type === "image" || shape.type === "sketchpad") &&
        showControlPanel && (
          <div
            className="absolute left-full ml-2 top-0"
            style={{
              zIndex: 101,
              pointerEvents: "all",
              width: "max-content",
            }}
          >
            {controls
              .filter((control) => control.processType)
              .map((control) => (
                <div
                  key={control.type}
                  className="bg-gray-50 rounded-md mb-1 p-1 border border-gray-200 shadow-sm"
                >
                  <div
                    className={`group relative py-0.5 ${
                      control.showKey && shape[control.showKey as keyof Shape]
                        ? "w-max"
                        : "w-max"
                    }`}
                  >
                    {control.showKey && (
                      <Tooltip
                        content={
                          <div>
                            <h4 className="font-medium mb-1">{control.type}</h4>
                            <p>
                              {getControlDescription(
                                control.type as ControlType
                              )}
                            </p>
                          </div>
                        }
                      >
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={Boolean(
                              shape[control.showKey as keyof Shape]
                            )}
                            onChange={(e) => handleCheckboxChange(control, e)}
                            className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-0"
                            style={{ pointerEvents: "all" }}
                          />
                          <span className="text-xs text-gray-700 whitespace-nowrap">
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
                              <div className="absolute left-3/4 -top-6   bg-gray-500 text-white px-2 py-1 rounded text-xs">
                                {(
                                  shape[
                                    control.strengthKey as keyof Shape
                                  ] as number
                                )?.toFixed(2) ?? "0.25"}
                              </div>
                            )}
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
                              className="mini-slider w-24"
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
      {/* Image Controls – Action Dropdown */}
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
      {/* Resize handle */}
      {showManipulationControls && (
        <div
          className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-se-resize"
          style={{ zIndex: 101, pointerEvents: "all" }}
          onMouseDown={handleResizeStart}
        />
      )}
      {/* Color picker for non-image/canvas/sticky shapes */}
      {shape.type !== "image" &&
        shape.type !== "sketchpad" &&
        shape.type !== "group" &&
        shape.type !== "sticky" &&
        shape.type !== "3d" && (
          <input
            type="color"
            value={shape.color}
            onChange={(e) => updateShape(shape.id, { color: e.target.value })}
            className="absolute -left-6 top-1/2 w-4 h-4 cursor-pointer transform -translate-y-1/2"
            style={{ zIndex: 101, pointerEvents: "all" }}
          />
        )}
      {/* Diffusion Settings controls */}
      {shape.type === "diffusionSettings" && (
        <div
          className="absolute left-1/2 top-full mt-1 bg-white p-1.5 rounded border border-gray-200 transform -translate-x-1/2"
          style={{ zIndex: 101, pointerEvents: "all", width: "160px" }}
        >
          <div className="flex items-center gap-1.5">
            <input
              type="checkbox"
              id={`use-settings-${shape.id}`}
              checked={shape.useSettings || false}
              onChange={(e) => {
                if (e.target.checked) {
                  // Uncheck other diffusionSettings shapes
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
              className="w-3 h-3 cursor-pointer"
            />
            <label
              htmlFor={`use-settings-${shape.id}`}
              className="text-xs text-gray-700 cursor-pointer whitespace-nowrap"
            >
              Use Settings
            </label>
          </div>
        </div>
      )}
      {/* Dice button for sticky notes */}
      {shape.type === "sticky" && isSelected && (
        <Tooltip content="Add a random text prompt" side="bottom">
          <div
            className="absolute -left-0 -bottom-7 w-6 h-6 bg-white border border-gray-200 rounded-2px cursor-pointer hover:bg-gray-50 flex items-center justify-center shadow-sm"
            style={{ zIndex: 101, pointerEvents: "all" }}
            onClick={(e) => {
              e.stopPropagation();
              const randomPrompt = generatePrompt();
              updateShape(shape.id, {
                content: randomPrompt,
              });
            }}
          >
            <img
              src="/dice-outline.svg"
              alt="Random prompt"
              className="w-5 h-5 text-gray-200"
            />
          </div>
        </Tooltip>
      )}
      {/* Sticky note controls */}
      {shape.type === "sticky" && (
        <div
          className="absolute left-1/2 top-full mt-1 bg-white p-1.5 rounded border border-gray-200 transform -translate-x-1/2"
          style={{ zIndex: 101, pointerEvents: "all", width: "160px" }}
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
                    <br />
                  </p>
                </div>
              }
            >
              <div className="flex items-center gap-1.5">
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
                  className="w-3 h-3 cursor-pointer"
                />
                <label
                  htmlFor={`prompt-${shape.id}`}
                  className="text-xs text-gray-700 cursor-pointer whitespace-nowrap"
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
              <div className="flex items-center gap-1.5">
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
                  className="w-3 h-3 cursor-pointer"
                />
                <label
                  htmlFor={`negative-${shape.id}`}
                  className="text-xs text-gray-700 cursor-pointer whitespace-nowrap"
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
              className="absolute -left-0 -bottom-8 w-6 h-6 bg-white border border-gray-200 rounded-2px cursor-pointer hover:bg-gray-50 flex items-center justify-center shadow-sm"
              style={{ zIndex: 101, pointerEvents: "all" }}
              onClick={(e) => {
                e.stopPropagation();
                if (threeJSRef.current) {
                  threeJSRef.current.exportToGLTF();
                }
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
          </Tooltip>
        </div>
      )}
      {shape.type === "sketchpad" && (
        <div
          className="absolute -left-12 top-0 flex flex-col gap-2"
          style={{ zIndex: 101, pointerEvents: "all" }}
        >
          <Tooltip content="Brush Tool" side="left">
            <button
              onClick={() => {
                setTool("brush");
                setCurrentColor("#ffffff");
              }}
              className={`p-2 bg-white border border-gray-200 rounded-lg ${
                tool === "brush" ? "bg-blue-100 border-blue-500" : ""
              }`}
            >
              <Brush className="w-5 h-5" />
            </button>
          </Tooltip>
          <Tooltip content="Eraser Tool" side="left">
            <button
              onClick={() => {
                setTool("eraser");
                setCurrentColor("#000000");
              }}
              className={`p-2 bg-white border border-gray-200 rounded-lg ${
                tool === "eraser" ? "bg-blue-100 border-blue-500" : ""
              }`}
            >
              <Eraser className="w-5 h-5" />
            </button>
          </Tooltip>

          {(tool === "brush" || tool === "eraser") && (
            <div className="absolute left-12 top-0 bg-white shadow-lg rounded-lg p-4 flex flex-col gap-4">
              <BrushShapeSelector
                currentTexture={brushTexture}
                onTextureSelect={setBrushTexture}
              />
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Size</label>
                  <input
                    type="range"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    min="1"
                    max="100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Opacity</label>
                  <input
                    type="range"
                    value={brushOpacity}
                    onChange={(e) => setBrushOpacity(Number(e.target.value))}
                    min="0"
                    max="1"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
