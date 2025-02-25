import React from "react";
import { Shape } from "../../../types";
import { BrushPropertiesToolbar } from "./BrushPropertiesToolbar";
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
    mergeImages: (ids: string[]) => Promise<void>;
    onSelectSubject: (e: React.MouseEvent) => void;
    onCrop: (e: React.MouseEvent) => void;
    onDownload: (e: React.MouseEvent) => void;
    create3DDepth: (shape: Shape, position: { x: number; y: number }) => void;
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
  if (type === "image" || type === "shape") {
    if (!shape || !actions) return null;
    return (
      <ShapePropertiesToolbar
        shape={shape}
        selectedShapes={selectedShapes}
        shapes={shapes}
        actions={actions}
      />
    );
  }

  if (type === "brush" || type === "eraser") {
    if (!properties || !onPropertyChange) return null;
    return (
      <BrushPropertiesToolbar
        properties={properties}
        onPropertyChange={onPropertyChange}
      />
    );
  }

  return null;
};