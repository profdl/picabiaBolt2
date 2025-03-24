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
  Box
} from "lucide-react";
import { useThemeClass } from "../../../styles/useThemeClass";
import { Shape } from "../../../types";
import { Tooltip } from "../../shared/Tooltip";
import { ToolbarButton } from "../../shared/ToolbarButton";
import { useStore } from "../../../store";
import { OKColorPicker } from "../../shared/hsl-color-picker";
import { BrushSettingsPanel } from "./BrushShapeSelector";
import { NumberInput } from "../../shared/NumberInput";

interface ShapePropertiesToolbarProps {
  shape: Shape;
  selectedShapes: string[];
  shapes: Shape[];
  actions: {
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
  brushProperties?: {
    color?: string;
    texture?: string;
    size?: number;
    opacity?: number;
    rotation?: number;
    followPath?: boolean;
    spacing?: number;
    hardness?: number;
  };
  onBrushPropertyChange?: (property: string, value: unknown) => void;
}

export const ShapePropertiesToolbar: React.FC<ShapePropertiesToolbarProps> = ({
  shape,
  selectedShapes,
  shapes,
  actions,
  brushProperties,
  onBrushPropertyChange,
}) => {
  const { tool } = useStore((state) => ({
    tool: state.tool,
  }));
  const [showArrangeSubMenu, setShowArrangeSubMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [properties, setProperties] = useState(brushProperties || {});

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
      popup: "absolute z-50",
    },
    controlGroup: {
      container: "flex items-center gap-3",
      label: "text-sm font-medium text-neutral-500",
    },
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
    setProperties({ ...properties, color });
    onBrushPropertyChange?.("color", color);
  };

  const onPropertyChange = (property: string, value: unknown) => {
    setProperties({ ...properties, [property]: value });
    onBrushPropertyChange?.(property, value);
  };

  return (
    <div className={styles.buttonGroup}>
      {/* Select Tool Sub-toolbar */}
      {tool === "select" && shape && (
        <div className="flex items-center gap-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg h-9">
          <div className="flex items-center gap-0.5">
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
                        actions.sendBackward();
                        setShowArrangeSubMenu(false);
                      }}
                    >
                      <ArrowDown className="w-4 h-4" />
                      Send Backward
                    </button>
                    <button
                      className={styles.arrangeMenu.item}
                      onClick={() => {
                        actions.sendForward();
                        setShowArrangeSubMenu(false);
                      }}
                    >
                      <ArrowUp className="w-4 h-4" />
                      Send Forward
                    </button>
                    <button
                      className={styles.arrangeMenu.item}
                      onClick={() => {
                        actions.sendToBack();
                        setShowArrangeSubMenu(false);
                      }}
                    >
                      <MoveDown className="w-4 h-4" />
                      Send to Back
                    </button>
                    <button
                      className={styles.arrangeMenu.item}
                      onClick={() => {
                        actions.sendToFront();
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

            {shape.type === "image" && (
              <>
                <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-0.5" />
                <div className="flex items-center gap-0.5 px-1">
                  <Tooltip content="Generate Depth Map" side="top">
                    <button
                      className="text-[10px] font-medium tracking-wide uppercase text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                      onClick={async () => {
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
                          isEditing: false,
                          color: "transparent",
                          sourceImageId: shape.id,
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
                        
                        // Add the shape first
                        actions.addShape(newDepthShape);
                        
                        try {
                          // Generate the depth map
                          await actions.generatePreprocessedImage(shape.id, "depth");
                        } catch (error) {
                          console.error("Failed to generate depth map:", error);
                        }
                      }}
                    >
                      Depth
                    </button>
                  </Tooltip>

                  <Tooltip content="Generate Edge Map" side="top">
                    <button
                      className="text-[10px] font-medium tracking-wide uppercase text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                      onClick={async () => {
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
                          isEditing: false,
                          color: "transparent",
                          sourceImageId: shape.id,
                          showDepth: false,
                          showEdges: true,
                          showPose: false,
                          model: "",
                          useSettings: false,
                          isUploading: false,
                          contentStrength: 0.5,
                          sketchStrength: 0.5,
                          depthStrength: 0.5,
                          edgesStrength: 0.5,
                          poseStrength: 0.5,
                        };
                        
                        // Add the shape first
                        actions.addShape(newEdgesShape);
                        
                        try {
                          // Generate the edge map
                          await actions.generatePreprocessedImage(shape.id, "edge");
                        } catch (error) {
                          console.error("Failed to generate edge map:", error);
                        }
                      }}
                    >
                      Edges
                    </button>
                  </Tooltip>

                  <Tooltip content="Generate Pose Map" side="top">
                    <button
                      className="text-[10px] font-medium tracking-wide uppercase text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                      onClick={async () => {
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
                          isEditing: false,
                          color: "transparent",
                          sourceImageId: shape.id,
                          showDepth: false,
                          showEdges: false,
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
                        
                        // Add the shape first
                        actions.addShape(newPoseShape);
                        
                        try {
                          // Generate the pose map
                          await actions.generatePreprocessedImage(shape.id, "pose");
                        } catch (error) {
                          console.error("Failed to generate pose map:", error);
                        }
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
                    onClick={actions.onSelectSubject}
                  >
                    Remove BG
                  </button>
                </Tooltip>
                <Tooltip content="Crop Image" side="top">
                  <ToolbarButton
                    icon={<Crop className="w-4 h-4" />}
                    onClick={actions.onCrop}
                    className={styles.button}
                  />
                </Tooltip>
              </>
            )}

            <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-0.5" />
            <Tooltip content="Download" side="top">
              <ToolbarButton
                icon={<Download className="w-4 h-4" />}
                onClick={actions.onDownload}
                className={styles.button}
              />
            </Tooltip>
          </div>
        </div>
      )}

      {/* Brush Tool Sub-toolbar */}
      {tool === "brush" && properties && onBrushPropertyChange && (
        <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg h-9">
          <div className="flex items-center gap-3 relative">
            <div
              className={styles.colorPicker.trigger}
              onClick={() => setShowColorPicker(!showColorPicker)}
              style={{ backgroundColor: properties.color }}
            />

            {showColorPicker && (
              <div className={styles.colorPicker.popup}>
                <div
                  className="fixed inset-0"
                  onClick={() => setShowColorPicker(false)}
                />
                <OKColorPicker
                  value={properties.color}
                  onChange={handleColorChange}
                  defaultColor={{
                    hue: 0,
                    saturation: 100,
                    lightness: 50,
                  }}
                />
              </div>
            )}
            <BrushSettingsPanel
              currentTexture={properties.texture || "basic"}
              rotation={properties.rotation}
              spacing={properties.spacing}
              followPath={properties.followPath}
              onTextureSelect={(texture: string) => onPropertyChange("texture", texture)}
              onPropertyChange={onPropertyChange}
            />
          </div>
          <div className="flex items-center gap-6">
            <div className={styles.controlGroup.container}>
              <span className={styles.controlGroup.label}>Size</span>
              <NumberInput
                value={properties.size || 1}
                onChange={(value) => onPropertyChange("size", value)}
                min={1}
                max={100}
                step={1}
                formatValue={(v) => `${Math.round(v)}`}
              />
            </div>

            <div className={styles.controlGroup.container}>
              <span className={styles.controlGroup.label}>Opacity</span>
              <NumberInput
                value={(properties.opacity || 0) * 100}
                onChange={(value) => onPropertyChange("opacity", value / 100)}
                min={0}
                max={100}
                step={1}
                formatValue={(v) => `${Math.round(v)}%`}
              />
            </div>
            {properties.texture === 'soft' && (
              <div className={styles.controlGroup.container}>
                <span className={styles.controlGroup.label}>Hardness</span>
                <NumberInput
                  value={Math.round((properties.hardness ?? 1) * 100)}
                  onChange={(value) => onPropertyChange("hardness", value / 100)}
                  min={1}
                  max={100}
                  step={1}
                  formatValue={(v) => `${Math.round(v)}%`}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Eraser Tool Sub-toolbar */}
      {tool === "eraser" && properties && onBrushPropertyChange && (
        <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg h-9">
          <div className="flex items-center gap-6">
            <div className={styles.controlGroup.container}>
              <span className={styles.controlGroup.label}>Size</span>
              <NumberInput
                value={properties.size || 1}
                onChange={(value) => onPropertyChange("size", value)}
                min={1}
                max={100}
                step={1}
                formatValue={(v) => `${Math.round(v)}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Group/Ungroup buttons */}
      {selectedShapes.length > 1 && !selectedShapesInGroup && (
        <Tooltip content="Group Shapes" side="top">
          <ToolbarButton
            icon={<Group className="w-4 h-4" />}
            onClick={() => actions.createGroup(selectedShapes)}
            className={styles.button}
          />
        </Tooltip>
      )}

      {shape.type === "group" && (
        <Tooltip content="Ungroup" side="top">
          <ToolbarButton
            icon={<Ungroup className="w-4 h-4" />}
            onClick={() => actions.ungroup(shape.id)}
            className={styles.button}
          />
        </Tooltip>
      )}

      {selectedShapesInGroup && (
        <Tooltip content="Remove from Group" side="top">
          <ToolbarButton
            icon={<Ungroup className="w-4 h-4" />}
            onClick={() => actions.removeFromGroup(selectedShapes)}
            className={styles.button}
          />
        </Tooltip>
      )}

      {hasGroupAndShapes && selectedGroup && shapesToAdd.length > 0 && (
        <Tooltip content="Add to Group" side="top">
          <ToolbarButton
            icon={<Group className="w-4 h-4" />}
            onClick={() => actions.addToGroup(shapesToAdd, selectedGroup.id)}
            className={styles.button}
          />
        </Tooltip>
      )}

      {/* 3D Depth */}
      {shape.type === "image" && shape.depthPreviewUrl && (
        <Tooltip content="Create 3D Depth" side="top">
          <ToolbarButton
            icon={<Box className="w-4 h-4" />}
            onClick={() => {
              const newX = shape.position.x + shape.width + 20;
              actions.create3DDepth(shape, {
                x: newX,
                y: shape.position.y,
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
              onClick={() => actions.mergeImages(selectedShapes)}
              className={styles.button}
            />
          </Tooltip>
        </>
      )}
    </div>
  );
};
