import React, { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  MoveDown,
  MoveUp,
  Copy,
  Trash2,
  Group,
  Ungroup,
  Layers,
  Crop,
  Download,
  Mountain,
  Box,
  Brush,
  Wand
} from "lucide-react";
import { useThemeClass } from "../../../styles/useThemeClass";
import { Shape } from "../../../types";
import { Tooltip } from "../../shared/Tooltip";
import { ToolbarButton } from "../../shared/ToolbarButton";
import { useStore } from "../../../store";

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
  };
}

export const ShapePropertiesToolbar: React.FC<ShapePropertiesToolbarProps> = ({
  shape,
  selectedShapes,
  shapes,
  actions,
}) => {
  const { tool, setTool } = useStore((state) => ({
    tool: state.tool,
    setTool: state.setTool,
  }));
  const [showArrangeMenu, setShowArrangeMenu] = useState(false);
  const styles = {
    container:
      "absolute bottom-full mb-2.5 left-1/2 transform -translate-x-1/2 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-1.5",
    buttonGroup: "flex items-center gap-1",
    button: useThemeClass(["toolbar", "button", "base"]),
    divider: "w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1.5",
    arrangeMenu: {
      container: "absolute bottom-full mb-1 left-0 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-1 min-w-[160px]",
      item: "flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors",
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

  return (
    <div className={styles.container}>
      <div className={styles.buttonGroup}>
        {/* <span className="text-sm text-neutral-500 dark:text-neutral-400 mr-2">
          Arrange:
        </span> */}

        {/* Add brush tool button for image and sketchpad shapes */}
        {(shape.type === "image" || shape.type === "sketchpad") && (
          <>
            <Tooltip content="Brush Tool (B)" side="top">
              <ToolbarButton
                icon={<Brush />}
                active={tool === "brush"}
                onClick={() => {
                  setTool("brush");
                }}
                className={`${styles.button} ${
                  tool === "brush" ? "bg-neutral-200 dark:bg-neutral-600" : ""
                }`}
              />
            </Tooltip>

            <Tooltip content="Eraser Tool (E)" side="top">
              <ToolbarButton
                icon={<Wand />}
                active={tool === "eraser"}
                onClick={() => {
                  setTool("eraser");
                }}
                className={`${styles.button} ${
                  tool === "eraser" ? "bg-neutral-200 dark:bg-neutral-600" : ""
                }`}
              />
            </Tooltip>
            
            <div className={styles.divider} />
          </>
        )}

        {/* Arrange Menu Button */}
        <div className="relative">
          <Tooltip content="Arrange" side="top">
            <ToolbarButton
              icon={<Layers className="w-4 h-4" />}
              onClick={() => setShowArrangeMenu(!showArrangeMenu)}
              active={showArrangeMenu}
              className={styles.button}
            />
          </Tooltip>
          
          {showArrangeMenu && (
            <>
              <div
                className="fixed inset-0"
                onClick={() => setShowArrangeMenu(false)}
              />
              <div className={styles.arrangeMenu.container}>
                <button
                  className={styles.arrangeMenu.item}
                  onClick={() => {
                    actions.sendBackward();
                    setShowArrangeMenu(false);
                  }}
                >
                  <ArrowDown className="w-4 h-4" />
                  Send Backward
                </button>
                <button
                  className={styles.arrangeMenu.item}
                  onClick={() => {
                    actions.sendForward();
                    setShowArrangeMenu(false);
                  }}
                >
                  <ArrowUp className="w-4 h-4" />
                  Send Forward
                </button>
                <button
                  className={styles.arrangeMenu.item}
                  onClick={() => {
                    actions.sendToBack();
                    setShowArrangeMenu(false);
                  }}
                >
                  <MoveDown className="w-4 h-4" />
                  Send to Back
                </button>
                <button
                  className={styles.arrangeMenu.item}
                  onClick={() => {
                    actions.sendToFront();
                    setShowArrangeMenu(false);
                  }}
                >
                  <MoveUp className="w-4 h-4" />
                  Send to Front
                </button>
              </div>
            </>
          )}
        </div>

        <div className={styles.divider} />

        <Tooltip content="Duplicate" side="top">
          <ToolbarButton
            icon={<Copy className="w-4 h-4" />}
            onClick={actions.duplicate}
            className={styles.button}
          />
        </Tooltip>

        <Tooltip content="Delete" side="top">
          <ToolbarButton
            icon={<Trash2 className="w-4 h-4" />}
            onClick={() => actions.deleteShape(shape.id)}
            className={styles.button}
          />
        </Tooltip>
        {/* Remove Background */}
        {shape.type === "image" && (
          <Tooltip content="Remove Background" side="top">
            <ToolbarButton
              icon={<Mountain className="w-4 h-4" />}
              onClick={actions.onSelectSubject}
              className={styles.button}
            />
          </Tooltip>
        )}
        {shape.type === "image" && (
          <Tooltip content="Crop Image" side="top">
            {/* Crop */}
            <ToolbarButton
              icon={<Crop className="w-4 h-4" />}
              onClick={actions.onCrop}
              className={styles.button}
            />
          </Tooltip>
        )}
        {/* 3D Depth  */}

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

        {/* Download  */}
        <Tooltip content="Download Image" side="top">
          <ToolbarButton
            icon={<Download className="w-4 h-4" />}
            onClick={actions.onDownload}
            className={styles.button}
          />
        </Tooltip>

        {/* Flatten - show for all image shapes */}
        {shape.type === "image" && (
          <Tooltip content="Flatten Image" side="top">
            <ToolbarButton
              icon={<Layers className="w-4 h-4" />}
              onClick={actions.onFlatten}
              className={styles.button}
            />
          </Tooltip>
        )}

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
    </div>
  );
};
