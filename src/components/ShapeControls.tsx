import { useState, useEffect } from "react";
import { useStore } from "../store";
import { Shape } from "../types";
import { ImageActionDropdown } from "./ImageActionDropdown";

interface ShapeControlsProps {
  shape: Shape;
  isSelected: boolean;
  isEditing: boolean;
  handleResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function ShapeControls({
  shape,
  isSelected,
  handleResizeStart,
}: ShapeControlsProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { sendToBack, sendToFront, sendBackward, sendForward, deleteShape } =
    useStore();

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

  const prompts = [
    "A wilted rose droops beside an antique cracked porcelain teacup and weathered book, chiaroscuro lighting casting long shadows against gradient background.",
    "Chaotic sculptural installation featuring intricately knotted silk cords and suspended translucent resin forms casting delicate web-like shadows across dimly lit gallery walls and floor.",
    "Surreal organic wall relief sculpture showcasing deep crater-like voids and roughly welded metallic surfaces, softly illuminated by angled lights in raw industrial studio space.",
    "Minimalist wooden bench crafted with sharp geometric lines and exposed joinery, positioned under single bright spotlight in pristine white gallery space, emphasizing natural wood grain.",
    "Large abstract painting rendered in cool blues and misty greys suggesting layers of mountain fog, displayed on stark gallery wall above polished concrete floor catching subtle reflections.",
    "Vibrant swimming pool scene captured from above, featuring crystal turquoise water rippling around hot pink pool floats, surrounded by pristine white tiles under bright summer sunlight.",
    "Surreal dark kitchen scene where animated silver cutlery dances around grotesque food sculptures, creating eerie movements in deep shadows beneath dim vintage lighting fixtures.",
    "Dynamic kaleidoscopic photomontage combining fragmented human faces, classical architectural details, and mechanical parts arranged in spiraling patterns across experimental gallery installation.",
    "Striking black and white photograph capturing mysterious overlap of classical mannequin head, elongated chess piece shadow, and spiral staircase under harsh directional studio lighting.",
    "Bold geometric photography composition featuring angular metallic surfaces intersecting with deep shadows, arranged within clean lines of modernist concrete and glass architectural setting.",
    "Immersive installation of chaotic cardboard sculptures and crumpled metallic shapes, interspersed with urgent handwritten text fragments creating sense of disorder.",
    "Meticulously detailed gallery wall covered in precise rows of handwritten graphite patterns creating overwhelming sense of academic intensity.",
    "Sleek modern record player featuring minimalist aluminum body and warm wooden accents, photographed on clean desk surface in softly lit contemporary living space.",
    "Inviting lounge chair showcasing gently curved wooden shell and rich leather upholstery, positioned near floor-to-ceiling window overlooking lush garden landscape in afternoon light.",
    "Ultramodern chrome citrus juicer with striking design and elegant mechanical details, centered on expansive pristine white marble kitchen counter under subtle spotlighting.",
    "Bold sculptural coffee table featuring fluid pink-and-orange curves and high-gloss surfaces, glowing dramatically in vibrantly decorated modern living space with ambient lighting.",
    "Nature-inspired modern house design showcasing strong horizontal lines and dramatic cantilevered roofs, photographed during golden hour as it blends seamlessly into wooded landscape.",
    "Spacious open-plan studio apartment featuring modular grid-based furniture and primary-colored storage shelving, naturally lit through towering industrial windows with city views.",
    "Elegant modernist glass pavilion surrounded by serene reflecting pool capturing sky reflections, sparsely furnished with classic pieces amongst mature trees and landscaping.",
    "Contemporary museum building showcasing transparent glass facade supported by intricate steel framework, photographed overlooking bustling urban plaza filled with visitors.",
    "Artfully curved wooden dining chair with smooth lacquer finish positioned at round marble table, surrounded by refined Scandinavian-inspired decor in elegant dining space.",
    "Dramatic interior featuring sweeping sculptural staircase inspired by seashell spirals, enhanced by cleverly hidden lighting elements reflecting off polished stone floors.",
    "Industrial-style desk lamp combining matte black steel framework with natural wood base elements, positioned on raw metal workbench in minimalist creative studio setting.",
  ];

  // Randomly select a prompt from the array
  function getRandomPrompt() {
    const randomIndex = Math.floor(Math.random() * prompts.length);
    return prompts[randomIndex];
  }

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
    isSelected || anyCheckboxChecked || shape.useSettings;

  if (!showControlPanel) return null;

  const handleCheckboxChange = async (
    control: (typeof controls)[0],
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    console.log("Control:", control);
    console.log("Shape before update:", shape);
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

    // Update the checkbox state immediately
    updateShape(shape.id, { [control.showKey]: isChecked });

    // Uncheck other images' same control
    shapes.forEach((otherShape) => {
      if (otherShape.id !== shape.id && otherShape.type === "image") {
        const showKey = control.showKey as keyof Shape;
        if (otherShape[showKey]) {
          updateShape(otherShape.id, { [control.showKey]: false });
        }
      }
    });

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
    <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
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
                                )?.toFixed(2) ?? "0.50"}
                              </div>
                            )}
                            <input
                              type="range"
                              min={control.type === "Remix" ? "0.1" : "0"}
                              max={control.type === "Remix" ? "2.0" : "1"}
                              step="0.05"
                              value={
                                typeof shape[
                                  control.strengthKey as keyof Shape
                                ] === "number"
                                  ? (shape[
                                      control.strengthKey as keyof Shape
                                    ] as number)
                                  : 0.75
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
        shape.type !== "sticky" && (
          <input
            type="color"
            value={shape.color}
            onChange={(e) => updateShape(shape.id, { color: e.target.value })}
            className="absolute -left-6 top-1/2 w-4 h-4 cursor-pointer transform -translate-y-1/2"
            style={{ zIndex: 101, pointerEvents: "all" }}
          />
        )}

      {/* Color picker for sketchpad shapes */}
      {shape.type === "sketchpad" && (
        <input
          type="color"
          value={shape.color || "#000000"}
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
        <div
          className="absolute -left-0 -bottom-7 w-6 h-6 bg-white border border-gray-200 rounded-2px cursor-pointer hover:bg-gray-50 flex items-center justify-center shadow-sm"
          style={{ zIndex: 101, pointerEvents: "all" }}
          onClick={(e) => {
            e.stopPropagation();
            const randomPrompt = getRandomPrompt();
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
      )}

      {/* Sticky note controls */}
      {shape.type === "sticky" && (
        <div
          className="absolute left-1/2 top-full mt-1 bg-white p-1.5 rounded border border-gray-200 transform -translate-x-1/2"
          style={{ zIndex: 101, pointerEvents: "all", width: "160px" }}
        >
          <div className="flex flex-col gap-1.5">
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
                          color: otherShape.showPrompt ? "#90EE90" : "#fff9c4",
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
          </div>
        </div>
      )}
    </div>
  );
}
