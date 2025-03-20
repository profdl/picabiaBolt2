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
  Eraser,
  MousePointer,
  Hand
} from "lucide-react";
import { useThemeClass } from "../../../styles/useThemeClass";
import { Shape } from "../../../types";
import { Tooltip } from "../../shared/Tooltip";
import { ToolbarButton } from "../../shared/ToolbarButton";
import { DropdownButton } from "../../shared/DropdownButton";
import { useStore } from "../../../store";
import { BrushPropertiesToolbar } from "./BrushPropertiesToolbar";

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
  const { tool, setTool } = useStore((state) => ({
    tool: state.tool,
    setTool: state.setTool,
  }));
  const [showShapeActionsMenu, setShowShapeActionsMenu] = useState(false);
  const [showArrangeSubMenu, setShowArrangeSubMenu] = useState(false);
  const styles = {
    buttonGroup: "flex items-center gap-1",
    button: useThemeClass(["toolbar", "button", "base"]),
    divider: "w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1.5",
    arrangeMenu: {
      container: "absolute bottom-full mb-1 left-0 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-1 min-w-[160px]",
      item: "flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors",
    },
    shapeActionsMenu: {
      container: "absolute bottom-full mb-1 right-0 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-1 min-w-[160px]",
      item: "flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors",
      subMenuContainer: "absolute left-full top-0 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-1 min-w-[160px]",
      subMenuWrapper: "absolute left-full top-0",
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
    <div className={styles.buttonGroup}>
      {/* Add select tool button */}
      <Tooltip content="Select Tool (V)" side="top">
        <ToolbarButton
          icon={<MousePointer />}
          active={tool === "select"}
          onClick={() => setTool("select")}
          className={`${styles.button} ${
            tool === "select" ? "bg-neutral-200 dark:bg-neutral-600" : ""
          }`}
        />
      </Tooltip>

      {/* Add pan tool button */}
      <Tooltip content="Pan Tool (Space)" side="top">
        <ToolbarButton
          icon={<Hand />}
          active={tool === "pan"}
          onClick={() => setTool("pan")}
          className={`${styles.button} ${
            tool === "pan" ? "bg-neutral-200 dark:bg-neutral-600" : ""
          }`}
        />
      </Tooltip>

      <div className={styles.divider} />

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
              icon={<Eraser />}
              active={tool === "eraser"}
              onClick={() => {
                setTool("eraser");
              }}
              className={`${styles.button} ${
                tool === "eraser" ? "bg-neutral-200 dark:bg-neutral-600" : ""
              }`}
            />
          </Tooltip>
          
          {(tool === "brush" || tool === "eraser") && brushProperties && onBrushPropertyChange && (
            <>
              <div className={styles.divider} />
              <BrushPropertiesToolbar
                properties={brushProperties}
                onPropertyChange={onBrushPropertyChange}
              />
            </>
          )}
          
          <div className={styles.divider} />
        </>
      )}

      {/* Shape Actions Menu Button */}
      <div className="relative">
        <DropdownButton
          label="Shape Actions"
          isOpen={showShapeActionsMenu}
          onClick={() => setShowShapeActionsMenu(!showShapeActionsMenu)}
        />
        
        {showShapeActionsMenu && (
          <>
            <div
              className="fixed inset-0"
              onClick={() => setShowShapeActionsMenu(false)}
            />
            <div className={styles.shapeActionsMenu.container}>
              <button
                className={styles.shapeActionsMenu.item}
                onClick={() => {
                  actions.duplicate();
                  setShowShapeActionsMenu(false);
                }}
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              <button
                className={styles.shapeActionsMenu.item}
                onClick={() => {
                  actions.deleteShape(shape.id);
                  setShowShapeActionsMenu(false);
                }}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                className={styles.shapeActionsMenu.item}
                onClick={(e) => {
                  actions.onDownload(e);
                  setShowShapeActionsMenu(false);
                }}
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                className={styles.shapeActionsMenu.item}
                onClick={(e) => {
                  actions.onFlatten(e);
                  setShowShapeActionsMenu(false);
                }}
              >
                <Layers className="w-4 h-4" />
                Flatten
              </button>
              <div className="relative">
                <button
                  className={styles.shapeActionsMenu.item}
                  onMouseEnter={() => setShowArrangeSubMenu(true)}
                  onMouseLeave={() => setShowArrangeSubMenu(false)}
                >
                  <ArrowUp className="w-4 h-4" />
                  Arrange
                  <ArrowUp className="w-4 h-4 ml-auto" />
                </button>
                {showArrangeSubMenu && (
                  <div 
                    className={styles.shapeActionsMenu.subMenuWrapper}
                    onMouseEnter={() => setShowArrangeSubMenu(true)}
                    onMouseLeave={() => setShowArrangeSubMenu(false)}
                  >
                    <div className={styles.shapeActionsMenu.subMenuContainer}>
                      <button
                        className={styles.shapeActionsMenu.item}
                        onClick={() => {
                          actions.sendBackward();
                          setShowShapeActionsMenu(false);
                        }}
                      >
                        <ArrowDown className="w-4 h-4" />
                        Send Backward
                      </button>
                      <button
                        className={styles.shapeActionsMenu.item}
                        onClick={() => {
                          actions.sendForward();
                          setShowShapeActionsMenu(false);
                        }}
                      >
                        <ArrowUp className="w-4 h-4" />
                        Send Forward
                      </button>
                      <button
                        className={styles.shapeActionsMenu.item}
                        onClick={() => {
                          actions.sendToBack();
                          setShowShapeActionsMenu(false);
                        }}
                      >
                        <MoveDown className="w-4 h-4" />
                        Send to Back
                      </button>
                      <button
                        className={styles.shapeActionsMenu.item}
                        onClick={() => {
                          actions.sendToFront();
                          setShowShapeActionsMenu(false);
                        }}
                      >
                        <MoveUp className="w-4 h-4" />
                        Send to Front
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {shape.type === "image" && (
                <>
                  <button
                    className={styles.shapeActionsMenu.item}
                    onClick={(e) => {
                      actions.onCrop(e);
                      setShowShapeActionsMenu(false);
                    }}
                  >
                    <Crop className="w-4 h-4" />
                    Crop
                  </button>
                  <button
                    className={styles.shapeActionsMenu.item}
                    onClick={(e) => {
                      actions.onSelectSubject(e);
                      setShowShapeActionsMenu(false);
                    }}
                  >
                    <Mountain className="w-4 h-4" />
                    Remove Background
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

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
  );
};
