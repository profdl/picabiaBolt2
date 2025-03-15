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
} from "lucide-react";
import { Shape, ContextMenuItem } from "../types";

type ContextMenuActions = {
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
};

export const createShapeContextMenu = (
  shape: Shape,
  selectedShapes: string[],
  actions: ContextMenuActions,
  shapes: Shape[] = []
): ContextMenuItem[] => {
  const menuItems: ContextMenuItem[] = [];

  // Check if any selected shapes are in a group
  const selectedShapeObjects = shapes.filter(s => selectedShapes.includes(s.id));
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

  // Add group-related options
  if (selectedShapesInGroup) {
    menuItems.push({
      label: "Remove from Group",
      action: () => actions.removeFromGroup(selectedShapes),
      icon: React.createElement(Ungroup, { className: "w-4 h-4" }),
    });
  } else if (hasGroupAndShapes && selectedGroup && shapesToAdd.length > 0) {
    menuItems.push({
      label: "Add to Group",
      action: () => actions.addToGroup(shapesToAdd, selectedGroup.id),
      icon: React.createElement(Group, { className: "w-4 h-4" }),
    });
  }

  // Check for multiple selected images first
  const areAllImages = selectedShapeObjects.length > 1 && 
    selectedShapeObjects.every((s) => s.type === "image");

  // Add merge option if multiple images are selected
  if (areAllImages) {
    menuItems.push({
      label: "Merge as New Image",
      action: () => actions.mergeImages(selectedShapes),
      icon: React.createElement(Layers, { className: "w-4 h-4" }),
    });
  }

  // Add the rest of the menu items
  menuItems.push(
    {
      label: "Send Backward",
      action: actions.sendBackward,
      icon: React.createElement(ArrowDown, { className: "w-4 h-4" }),
    },
    {
      label: "Send Forward",
      action: actions.sendForward,
      icon: React.createElement(ArrowUp, { className: "w-4 h-4" }),
    },
    {
      label: "Send to Back",
      action: actions.sendToBack,
      icon: React.createElement(MoveDown, { className: "w-4 h-4" }),
    },
    {
      label: "Send to Front",
      action: actions.sendToFront,
      icon: React.createElement(MoveUp, { className: "w-4 h-4" }),
    },
    {
      label: "Duplicate",
      action: actions.duplicate,
      icon: React.createElement(Copy, { className: "w-4 h-4" }),
    },
    {
      label: "Delete",
      action: () => actions.deleteShape(shape.id),
      icon: React.createElement(Trash2, { className: "w-4 h-4" }),
    }
  );

  // Add group option if multiple shapes are selected
  if (selectedShapes.length > 1 && !selectedShapesInGroup) {
    menuItems.unshift({
      label: "Group",
      action: () => actions.createGroup(selectedShapes),
      icon: React.createElement(Group, { className: "w-4 h-4" }),
    });
  }

  // Add ungroup option if this is a group
  if (shape.type === "group") {
    menuItems.unshift({
      label: "Ungroup",
      action: () => actions.ungroup(shape.id),
      icon: React.createElement(Ungroup, { className: "w-4 h-4" }),
    });
  }

  return menuItems;
};