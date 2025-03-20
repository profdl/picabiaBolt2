import React from "react";
import { Shape } from "../../../types";
import { ShapePropertiesToolbar } from "./ShapePropertiesToolbar";
import { useStore } from "../../../store";

interface PropertiesToolbarProps {
  type: "brush" | "eraser" | "image" | "shape" | "sketchpad";
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
  };
}

export const PropertiesToolbar: React.FC<PropertiesToolbarProps> = ({
  type,
  properties,
  onPropertyChange,
  shape,
  selectedShapes = [],
  shapes = [],
  actions,
}) => {
  const { tool } = useStore((state) => ({
    tool: state.tool,
  }));

  // Show shape properties if we have a shape and actions
  const showShapeProperties = (type === "image" || type === "shape" || type === "sketchpad") && shape && actions;
  // Show brush properties when brush/eraser is active and we have the required props
  const showBrushProperties = (type === "brush" || type === "eraser") && properties && onPropertyChange;
  
  // Show toolbar if either shape or brush properties should be shown, or if pan tool is active
  const showToolbar = showShapeProperties || showBrushProperties || tool === "pan";

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
  const displayActions = tool === "pan" && !actions ? {
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
  } : actions;

  return (
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 flex flex-col gap-2 mb-2">
      {showToolbar && (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-1.5">
          <ShapePropertiesToolbar
            shape={displayShape!}
            selectedShapes={selectedShapes}
            shapes={shapes}
            actions={displayActions!}
            brushProperties={showBrushProperties ? properties : undefined}
            onBrushPropertyChange={showBrushProperties ? onPropertyChange : undefined}
          />
        </div>
      )}
    </div>
  );
};