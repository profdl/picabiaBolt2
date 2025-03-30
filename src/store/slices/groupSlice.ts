import { StateCreator } from "zustand";
import { Shape } from "../../types";
import { shapeLayout } from '../../utils/shapeLayout';

const MAX_HISTORY = 50;

interface GroupState {
  shapes: Shape[];
  history: Shape[][];
  historyIndex: number;
}

interface GroupSlice extends GroupState {
  createGroup: (shapeIds: string[]) => void;
  ungroup: (groupId: string) => void;
  addToGroup: (shapeIds: string[], groupId: string) => void;
  removeFromGroup: (shapeIds: string[]) => void;
}

export const groupSlice: StateCreator<GroupSlice, [], [], GroupSlice> = (
  set
) => ({
  shapes: [],
  history: [[]],
  historyIndex: 0,

  createGroup: (shapeIds) =>
    set((state) => {
      const groupId = Math.random().toString(36).substr(2, 9);
      const groupedShapes = state.shapes.filter((s) => shapeIds.includes(s.id));
      
      // Calculate bounds using layout utility
      const bounds = shapeLayout.calculateGroupBounds(groupedShapes);

      // Create the group shape
      const groupShape: Shape = {
        id: groupId,
        type: "group",
        position: { x: bounds.x, y: bounds.y },
        width: bounds.width,
        height: bounds.height,
        rotation: 0,
        color: "transparent",
        isUploading: false,
        isEditing: false,
        model: "",
        useSettings: false,
        groupEnabled: true,
      };

      // Update shapes with new groupId
      const updatedShapes = state.shapes.map((shape) =>
        shapeIds.includes(shape.id) ? { ...shape, groupId } : shape
      );

      return {
        shapes: [groupShape, ...updatedShapes.filter(s => s.id !== groupId)],
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          [groupShape, ...updatedShapes.filter(s => s.id !== groupId)],
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
      };
    }),

  ungroup: (groupId) =>
    set((state) => {
      const updatedShapes = state.shapes
        .filter((s) => s.id !== groupId)
        .map((s) => (s.groupId === groupId ? { ...s, groupId: undefined } : s));

      return {
        shapes: updatedShapes,
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          updatedShapes,
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
      };
    }),

  addToGroup: (shapeIds, groupId) =>
    set((state) => {
      const groupShape = state.shapes.find((s) => s.id === groupId);
      if (!groupShape || groupShape.type !== "group") return state;

      const shapesToAdd = state.shapes.filter((s) => shapeIds.includes(s.id));
      
      // Calculate new bounds including the added shapes
      const allGroupedShapes = [
        ...state.shapes.filter((s) => s.groupId === groupId),
        ...shapesToAdd,
      ];
      
      const bounds = shapeLayout.calculateGroupBounds(allGroupedShapes);

      // Update the group shape with new dimensions
      const updatedGroupShape = {
        ...groupShape,
        position: { x: bounds.x, y: bounds.y },
        width: bounds.width,
        height: bounds.height,
      };

      // Update shapes with new groupId
      const updatedShapes = state.shapes.map((shape) =>
        shapeIds.includes(shape.id) ? { ...shape, groupId } : shape
      );

      return {
        shapes: [updatedGroupShape, ...updatedShapes.filter(s => s.id !== groupId)],
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          [updatedGroupShape, ...updatedShapes.filter(s => s.id !== groupId)],
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
      };
    }),

  removeFromGroup: (shapeIds) =>
    set((state) => {
      const shapesToRemove = state.shapes.filter((s) => shapeIds.includes(s.id));
      const groupIds = [...new Set(shapesToRemove.map(s => s.groupId))].filter(Boolean) as string[];

      // Update shapes by removing their groupId
      const updatedShapes = state.shapes.map((shape) =>
        shapeIds.includes(shape.id) ? { ...shape, groupId: undefined } : shape
      );

      // Update group shapes if needed
      const updatedGroupShapes = groupIds.map(groupId => {
        const groupShape = state.shapes.find(s => s.id === groupId);
        if (!groupShape) return null;

        const remainingGroupedShapes = updatedShapes.filter(s => s.groupId === groupId);
        
        // If no shapes remain in the group, don't include the group
        if (remainingGroupedShapes.length === 0) return null;

        // Otherwise, recalculate the group bounds based on remaining shapes
        const bounds = shapeLayout.calculateGroupBounds(remainingGroupedShapes);

        return {
          ...groupShape,
          position: { x: bounds.x, y: bounds.y },
          width: bounds.width,
          height: bounds.height,
        };
      }).filter((shape): shape is Shape => shape !== null);

      // Combine the updated group shapes with the non-group shapes
      // Ensure we only include shapes that are not part of a deleted group
      const shapesToKeep = updatedShapes.filter(s => !groupIds.includes(s.id));
      
      return {
        shapes: [...updatedGroupShapes, ...shapesToKeep],
        history: [
          ...state.history.slice(0, state.historyIndex + 1),
          [...updatedGroupShapes, ...shapesToKeep],
        ].slice(-MAX_HISTORY),
        historyIndex: state.historyIndex + 1,
      };
    }),
}); 