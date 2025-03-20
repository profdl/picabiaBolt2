import React from "react";
import { Shape } from "../../../types";
import { ShapePropertiesToolbar } from "./ShapePropertiesToolbar";

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
  // Show shape properties if we have a shape and actions
  const showShapeProperties = (type === "image" || type === "shape") && shape && actions;
  // Show brush properties when brush/eraser is active and we have the required props
  const showBrushProperties = (type === "brush" || type === "eraser") && properties && onPropertyChange;
  
  // Show toolbar if either shape or brush properties should be shown
  const showToolbar = showShapeProperties || showBrushProperties;

  return (
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 flex flex-col gap-2 mb-2">
      {showToolbar && (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-1.5">
          <ShapePropertiesToolbar
            shape={shape!}
            selectedShapes={selectedShapes}
            shapes={shapes}
            actions={actions!}
            brushProperties={showBrushProperties ? properties : undefined}
            onBrushPropertyChange={showBrushProperties ? onPropertyChange : undefined}
          />
        </div>
      )}
    </div>
  );
};