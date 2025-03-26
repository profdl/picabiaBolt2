import React, { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  MoveDown,
  MoveUp,
  Group,
  Ungroup,
  Layers,
  Crop,
  Download,
  Box,
  MousePointer,
  Brush,
  Eraser,
} from "lucide-react";
import { Shape } from "../../../types";
import { useStore } from "../../../store";
import { Tooltip } from "../../shared/Tooltip";
import { ToolbarButton } from "../../shared/ToolbarButton";
import { OKColorPicker } from "../../shared/hsl-color-picker";
import { BrushSettingsPanel } from "./BrushShapeSelector";
import { SmallSlider } from "../../shared/SmallSlider";
import { useThemeClass } from "../../../styles/useThemeClass";

interface PropertiesToolbarProps {
  type: "brush" | "eraser" | "image" | "shape";
  properties?: {
    color?: string;
    texture?: string;
    size?: number;
    opacity?: number;
    rotation?: number;
    followPath?: boolean;
    spacing?: number;
    hardness?: number;
  };
  onPropertyChange?: (property: string, value: unknown) => void;
  shape?: Shape;
  selectedShapes?: string[];
  shapes?: Shape[];
  actions?: {
    sendBackward: () => void;
    sendForward: () => void;
    sendToBack: () => void;
    sendToFront: () => void;
    duplicate: () => void;
    deleteShape: (id: string) => void;
    createGroup: (ids: string[]) => void;
    ungroup: (id: string) => void;
    addToGroup: (shapeIds: string[], groupId: string) => void;
    removeFromGroup: (shapeIds: string[]) => void;
    mergeImages: (ids: string[]) => Promise<void>;
    onSelectSubject: (e: React.MouseEvent) => void;
    onCrop: (e: React.MouseEvent) => void;
    onDownload: (e: React.MouseEvent) => void;
    create3DDepth: (shape: Shape, position: { x: number; y: number }) => void;
    onFlatten: (e: React.MouseEvent) => void;
    addShape: (shape: Shape) => void;
    generatePreprocessedImage: (id: string, type: string) => Promise<void>;
  };
}

export const PropertiesToolbar: React.FC<PropertiesToolbarProps> = ({
  properties,
  onPropertyChange,
  shape,
  selectedShapes = [],
  shapes = [],
  actions,
}) => {
  const { tool, addShape: storeAddShape, generatePreprocessedImage: storeGeneratePreprocessedImage, setTool } = useStore((state) => ({
    tool: state.tool,
    addShape: state.addShape,
    generatePreprocessedImage: state.generatePreprocessedImage,
    setTool: state.setTool,
  }));

  const [showArrangeSubMenu, setShowArrangeSubMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [localProperties, setLocalProperties] = useState(properties || {});

  const styles = {
    buttonGroup: "flex items-center gap-1",
    button: useThemeClass(["toolbar", "button", "base"]),
    divider: "w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1.5",
    arrangeMenu: {
      container: "absolute bottom-full mb-1 left-0 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-1 min-w-[160px]",
      item: "flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors",
    },
    colorPicker: {
      trigger: "w-6 h-6 rounded-full cursor-pointer",
      popup: "absolute bottom-full mb-1 left-0 z-50",
    },
    controlGroup: {
      container: "flex items-center gap-1.5 min-w-[120px]",
      label: "text-[10px] font-medium tracking-wide uppercase text-neutral-600 dark:text-neutral-400",
    },
  };

  // Create a dummy shape for pan tool when no shape is selected
  const displayShape = tool === "pan" && !shape ? {
    id: "pan-tool",
    type: "group" as const,
    position: { x: 0, y: 0 },
    width: 0,
    height: 0,
    rotation: 0,
    color: "transparent",
    groupEnabled: true,
  } : shape;

  // Create dummy actions for pan tool when no actions are provided
  const displayActions = {
    ...(actions || {
      sendBackward: () => {},
      sendForward: () => {},
      sendToBack: () => {},
      sendToFront: () => {},
      duplicate: () => {},
      deleteShape: () => {},
      createGroup: () => {},
      ungroup: () => {},
      addToGroup: () => {},
      removeFromGroup: () => {},
      mergeImages: async () => {},
      onSelectSubject: () => {},
      onCrop: () => {},
      onDownload: () => {},
      create3DDepth: () => {},
      onFlatten: () => {},
    }),
    addShape: (actions?.addShape || storeAddShape) as (shape: Shape) => void,
    generatePreprocessedImage: (actions?.generatePreprocessedImage || storeGeneratePreprocessedImage) as (id: string, type: string) => Promise<void>,
  };

  const selectedShapeObjects = shapes.filter((s) =>
    selectedShapes.includes(s.id)
  );
  const areAllImages =
    selectedShapeObjects.length > 1 &&
    selectedShapeObjects.every((s) => s.type === "image");

  // Check if any selected shapes are in a group
  const selectedShapesInGroup = selectedShapeObjects.some(s => s.groupId);

  // Check if a group is selected
  const isGroupSelected = selectedShapeObjects.some(s => s.type === "group");

  // Check if we have both a group and non-group shapes selected
  const hasGroupAndShapes = isGroupSelected && selectedShapeObjects.some(s => s.type !== "group");

  // Get the selected group if one exists
  const selectedGroup = selectedShapeObjects.find(s => s.type === "group");

  // Get shapes that can be added to the group (non-group shapes)
  const shapesToAdd = selectedShapeObjects
    .filter(s => s.type !== "group")
    .map(s => s.id);

  const handleColorChange = (color: string) => {
    setLocalProperties({ ...localProperties, color });
    onPropertyChange?.("color", color);
  };

  const handlePropertyChange = (property: string, value: unknown) => {
    setLocalProperties({ ...localProperties, [property]: value });
    onPropertyChange?.(property, value);
  };

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-[280px] flex flex-col gap-2 mb-2.5">
      <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-300 dark:border-neutral-800 py-1 px-1 h-[44px] inline-block">
        <div className="flex items-center h-full">
          {/* Tools Section - Fixed width */}
          <div className="flex items-center gap-2">
            <Tooltip content="Select Tool (V)" side="top">
              <ToolbarButton
                icon={<MousePointer className="w-4 h-4" />}
                active={tool === "select"}
                onClick={() => setTool("select")}
                className={styles.button}
              />
            </Tooltip>

            {/* Always show brush and eraser buttons, but disable them if not applicable */}
            <Tooltip content="Brush Tool (B)" side="top">
              <ToolbarButton
                icon={<Brush className="w-4 h-4" />}
                active={tool === "brush"}
                onClick={() => setTool("brush")}
                disabled={shape && shape.type !== "image" && shape.type !== "sketchpad"}
                className={`${styles.button} ${shape && shape.type !== "image" && shape.type !== "sketchpad" ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </Tooltip>

            <Tooltip content="Eraser Tool (E)" side="top">
              <ToolbarButton
                icon={<Eraser className="w-4 h-4" />}
                active={tool === "eraser"}
                onClick={() => setTool("eraser")}
                disabled={shape && shape.type !== "image" && shape.type !== "sketchpad"}
                className={`${styles.button} ${shape && shape.type !== "image" && shape.type !== "sketchpad" ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </Tooltip>
            <div className="w-[1px] h-6 bg-black dark:bg-black mx-2" />
          </div>

          {/* Content Section - Grows with content */}
          <div className="flex items-center gap-2 whitespace-nowrap pr-3">
            {/* Select Tool Sub-toolbar */}
            {tool === "select" && displayShape && (
              <div className="flex items-center gap-0.5">
                <div className="flex items-center gap-0.5">
                  {displayShape.type === "image" && (
                    <>
                      <div className="flex items-center gap-0.5 px-1">
                        <Tooltip content="Get Depth Reference from Image" side="top">
                          <button
                            className="text-[10px] font-medium tracking-wide uppercase text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                            onClick={async () => {
                              const newDepthShape: Shape = {
                                id: Math.random().toString(36).substr(2, 9),
                                type: "depth",
                                position: {
                                  x: displayShape.position.x + displayShape.width + 20,
                                  y: displayShape.position.y,
                                },
                                width: displayShape.width,
                                height: displayShape.height,
                                rotation: 0,
                                isEditing: false,
                                color: "transparent",
                                sourceImageId: displayShape.id,
                                showDepth: true,
                                model: "",
                                useSettings: false,
                                isUploading: false,
                                contentStrength: 0.5,
                                sketchStrength: 0.5,
                                depthStrength: 0.5,
                                edgesStrength: 0.5,
                                poseStrength: 0.5,
                              };
                              
                              displayActions.addShape(newDepthShape);
                            }}
                          >
                            Depth
                          </button>
                        </Tooltip>

                        <Tooltip content="Get Edges Reference from Image" side="top">
                          <button
                            className="text-[10px] font-medium tracking-wide uppercase text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                            onClick={async () => {
                              const newEdgesShape: Shape = {
                                id: Math.random().toString(36).substr(2, 9),
                                type: "edges",
                                position: {
                                  x: displayShape.position.x + displayShape.width + 20,
                                  y: displayShape.position.y,
                                },
                                width: displayShape.width,
                                height: displayShape.height,
                                rotation: 0,
                                isEditing: false,
                                color: "transparent",
                                sourceImageId: displayShape.id,
                                showEdges: true,
                                model: "",
                                useSettings: false,
                                isUploading: false,
                                contentStrength: 0.5,
                                sketchStrength: 0.5,
                                depthStrength: 0.5,
                                edgesStrength: 0.5,
                                poseStrength: 0.5,
                              };
                              
                              displayActions.addShape(newEdgesShape);
                            }}
                          >
                            Edges
                          </button>
                        </Tooltip>

                        <Tooltip content="Get Pose Reference from Image" side="top">
                          <button
                            className="text-[10px] font-medium tracking-wide uppercase text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                            onClick={async () => {
                              const newPoseShape: Shape = {
                                id: Math.random().toString(36).substr(2, 9),
                                type: "pose",
                                position: {
                                  x: displayShape.position.x + displayShape.width + 20,
                                  y: displayShape.position.y,
                                },
                                width: displayShape.width,
                                height: displayShape.height,
                                rotation: 0,
                                isEditing: false,
                                color: "transparent",
                                sourceImageId: displayShape.id,
                                showPose: true,
                                model: "",
                                useSettings: false,
                                isUploading: false,
                                contentStrength: 0.5,
                                sketchStrength: 0.5,
                                depthStrength: 0.5,
                                edgesStrength: 0.5,
                                poseStrength: 0.5,
                              };
                              
                              displayActions.addShape(newPoseShape);
                            }}
                          >
                            Pose
                          </button>
                        </Tooltip>
                      </div>

                      <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-0.5 mr-1.5" />
                      <Tooltip content="Remove Background" side="top">
                        <button
                          className="text-[10px] font-medium tracking-wide uppercase text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                          onClick={displayActions.onSelectSubject}
                        >
                          Remove BG
                        </button>
                      </Tooltip>
                      <Tooltip content="Crop Image" side="top">
                        <ToolbarButton
                          icon={<Crop className="w-4 h-4" />}
                          onClick={displayActions.onCrop}
                          className={styles.button}
                        />
                      </Tooltip>
                    </>
                  )}

                  <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-0.5" />
                  <div className="relative">
                    <Tooltip content="Arrange" side="top">
                      <ToolbarButton
                        icon={<Layers className="w-4 h-4" />}
                        onClick={() => setShowArrangeSubMenu(!showArrangeSubMenu)}
                        active={showArrangeSubMenu}
                        className={styles.button}
                      />
                    </Tooltip>
                    
                    {showArrangeSubMenu && (
                      <>
                        <div
                          className="fixed inset-0"
                          onClick={() => setShowArrangeSubMenu(false)}
                        />
                        <div className={styles.arrangeMenu.container}>
                          <button
                            className={styles.arrangeMenu.item}
                            onClick={() => {
                              displayActions.sendBackward();
                              setShowArrangeSubMenu(false);
                            }}
                          >
                            <ArrowDown className="w-4 h-4" />
                            Send Backward
                          </button>
                          <button
                            className={styles.arrangeMenu.item}
                            onClick={() => {
                              displayActions.sendForward();
                              setShowArrangeSubMenu(false);
                            }}
                          >
                            <ArrowUp className="w-4 h-4" />
                            Send Forward
                          </button>
                          <button
                            className={styles.arrangeMenu.item}
                            onClick={() => {
                              displayActions.sendToBack();
                              setShowArrangeSubMenu(false);
                            }}
                          >
                            <MoveDown className="w-4 h-4" />
                            Send to Back
                          </button>
                          <button
                            className={styles.arrangeMenu.item}
                            onClick={() => {
                              displayActions.sendToFront();
                              setShowArrangeSubMenu(false);
                            }}
                          >
                            <MoveUp className="w-4 h-4" />
                            Send to Front
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-0.5" />
                  <Tooltip content="Download" side="top">
                    <ToolbarButton
                      icon={<Download className="w-4 h-4" />}
                      onClick={displayActions.onDownload}
                      className={styles.button}
                    />
                  </Tooltip>
                </div>
              </div>
            )}

            {/* Brush Tool Sub-toolbar */}
            {tool === "brush" && localProperties && onPropertyChange && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-3 relative">
                  <div
                    className={styles.colorPicker.trigger}
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    style={{ backgroundColor: localProperties.color }}
                  />

                  {showColorPicker && (
                    <>
                      <div
                        className="fixed inset-0"
                        onClick={() => setShowColorPicker(false)}
                      />
                      <div className={styles.colorPicker.popup}>
                        <OKColorPicker
                          value={localProperties.color}
                          onChange={handleColorChange}
                          defaultColor={{
                            hue: 0,
                            saturation: 100,
                            lightness: 50,
                          }}
                        />
                      </div>
                    </>
                  )}
                  <BrushSettingsPanel
                    currentTexture={localProperties.texture || "basic"}
                    rotation={localProperties.rotation}
                    spacing={localProperties.spacing}
                    followPath={localProperties.followPath}
                    onTextureSelect={(texture: string) => handlePropertyChange("texture", texture)}
                    onPropertyChange={handlePropertyChange}
                  />
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <div className={styles.controlGroup.container}>
                    <span className={styles.controlGroup.label}>Size</span>
                    <div className="w-[120px]">
                      <SmallSlider
                        value={localProperties.size || 1}
                        onChange={(value) => handlePropertyChange("size", value)}
                        min={1}
                        max={100}
                        step={1}
                        label="Size"
                      />
                    </div>
                  </div>

                  <div className={styles.controlGroup.container}>
                    <span className={styles.controlGroup.label}>Opacity</span>
                    <div className="w-[120px]">
                      <SmallSlider
                        value={(localProperties.opacity || 0) * 100}
                        onChange={(value) => handlePropertyChange("opacity", value / 100)}
                        min={0}
                        max={100}
                        step={1}
                        label="Opacity"
                      />
                    </div>
                  </div>
                  {localProperties.texture === 'soft' && (
                    <div className={styles.controlGroup.container}>
                      <span className={styles.controlGroup.label}>Hardness</span>
                      <div className="w-[120px]">
                        <SmallSlider
                          value={Math.round((localProperties.hardness ?? 1) * 100)}
                          onChange={(value) => handlePropertyChange("hardness", value / 100)}
                          min={1}
                          max={100}
                          step={1}
                          label="Hardness"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Eraser Tool Sub-toolbar */}
            {tool === "eraser" && localProperties && onPropertyChange && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-6">
                  <div className={styles.controlGroup.container}>
                    <span className={`${styles.controlGroup.label} whitespace-nowrap`}>Size</span>
                    <div className="w-[120px]">
                      <SmallSlider
                        value={localProperties.size || 1}
                        onChange={(value) => handlePropertyChange("size", value)}
                        min={1}
                        max={100}
                        step={1}
                        label="Size"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Group/Ungroup buttons */}
            {selectedShapes.length > 1 && !selectedShapesInGroup && (
              <Tooltip content="Group Shapes" side="top">
                <ToolbarButton
                  icon={<Group className="w-4 h-4" />}
                  onClick={() => displayActions.createGroup(selectedShapes)}
                  className={styles.button}
                />
              </Tooltip>
            )}

            {displayShape?.type === "group" && (
              <Tooltip content="Ungroup" side="top">
                <ToolbarButton
                  icon={<Ungroup className="w-4 h-4" />}
                  onClick={() => displayActions.ungroup(displayShape.id)}
                  className={styles.button}
                />
              </Tooltip>
            )}

            {selectedShapesInGroup && (
              <Tooltip content="Remove from Group" side="top">
                <ToolbarButton
                  icon={<Ungroup className="w-4 h-4" />}
                  onClick={() => displayActions.removeFromGroup(selectedShapes)}
                  className={styles.button}
                />
              </Tooltip>
            )}

            {hasGroupAndShapes && selectedGroup && shapesToAdd.length > 0 && (
              <Tooltip content="Add to Group" side="top">
                <ToolbarButton
                  icon={<Group className="w-4 h-4" />}
                  onClick={() => displayActions.addToGroup(shapesToAdd, selectedGroup.id)}
                  className={styles.button}
                />
              </Tooltip>
            )}

            {/* 3D Depth */}
            {displayShape?.type === "image" && displayShape.depthPreviewUrl && (
              <Tooltip content="Create 3D Depth" side="top">
                <ToolbarButton
                  icon={<Box className="w-4 h-4" />}
                  onClick={() => {
                    const newX = displayShape.position.x + displayShape.width + 20;
                    displayActions.create3DDepth(displayShape, {
                      x: newX,
                      y: displayShape.position.y,
                    });
                  }}
                  className={styles.button}
                />
              </Tooltip>
            )}

            {areAllImages && (
              <>
                <div className={styles.divider} />
                <Tooltip content="Merge Images" side="top">
                  <ToolbarButton
                    icon={
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4" />
                        <span className="text-sm">Merge Images</span>
                      </div>
                    }
                    onClick={() => displayActions.mergeImages(selectedShapes)}
                    className={styles.button}
                  />
                </Tooltip>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};