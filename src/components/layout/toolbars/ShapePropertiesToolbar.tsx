import React from "react";
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
} from "lucide-react";
import { useThemeClass } from "../../../styles/useThemeClass";
import { Shape } from "../../../types";
import { Tooltip } from "../../shared/Tooltip";
import { ToolbarButton } from "../../shared/ToolbarButton";

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
    mergeImages: (ids: string[]) => Promise<void>;
    onSelectSubject: (e: React.MouseEvent) => void;
    onCrop: (e: React.MouseEvent) => void;
    onDownload: (e: React.MouseEvent) => void;
    create3DDepth: (shape: Shape, position: { x: number; y: number }) => void;
  };
}

export const ShapePropertiesToolbar: React.FC<ShapePropertiesToolbarProps> = ({
  shape,
  selectedShapes,
  shapes,
  actions,
}) => {
  const styles = {
    container:
      "absolute bottom-full mb-2.5 left-1/2 transform -translate-x-1/2 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-1.5",
    buttonGroup: "flex items-center gap-1",
    button: useThemeClass(["toolbar", "button", "base"]),
    divider: "w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1.5",
  };

  const selectedShapeObjects = shapes.filter((s) =>
    selectedShapes.includes(s.id)
  );
  const areAllImages =
    selectedShapeObjects.length > 1 &&
    selectedShapeObjects.every((s) => s.type === "image");

  return (
    <div className={styles.container}>
      <div className={styles.buttonGroup}>
        {/* <span className="text-sm text-neutral-500 dark:text-neutral-400 mr-2">
          Arrange:
        </span> */}

        <Tooltip content="Send Backward" side="top">
          <ToolbarButton
            icon={<ArrowDown className="w-4 h-4" />}
            onClick={actions.sendBackward}
            className={styles.button}
          />
        </Tooltip>

        <Tooltip content="Send Forward" side="top">
          <ToolbarButton
            icon={<ArrowUp className="w-4 h-4" />}
            onClick={actions.sendForward}
            className={styles.button}
          />
        </Tooltip>

        <Tooltip content="Send to Back" side="top">
          <ToolbarButton
            icon={<MoveDown className="w-4 h-4" />}
            onClick={actions.sendToBack}
            className={styles.button}
          />
        </Tooltip>

        <Tooltip content="Send to Front" side="top">
          <ToolbarButton
            icon={<MoveUp className="w-4 h-4" />}
            onClick={actions.sendToFront}
            className={styles.button}
          />
        </Tooltip>

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

        {selectedShapes.length > 1 && (
          <Tooltip content="Group Shapes" side="top">
            <ToolbarButton
              icon={
                <div className="flex items-center gap-1.5">
                  <Group className="w-4 h-4" />
                  <span className="text-sm">Group</span>
                </div>
              }
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
