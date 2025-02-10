// src/hooks/useShapeEvents.ts
import { useState, useEffect } from 'react';
import { Shape } from '../types';
import { useStore } from '../store';
import { createShapeContextMenu } from '../utils/shapeContextMenu';

interface UseShapeEventsProps {
  shape: Shape;
  isEditing: boolean;
  isSelected: boolean;
  zoom: number;
  textRef: React.RefObject<HTMLTextAreaElement>;
  initDragStart: (e: React.MouseEvent) => void;
}

export function useShapeEvents({
  shape,
  isEditing,
  textRef,
  initDragStart,
}: UseShapeEventsProps) {
  const {
    selectedShapes,
    setSelectedShapes,
    updateShape,
    deleteShape,
    setContextMenu,
    setIsEditingText,
    tool,
    sendBackward,
    sendForward,
    sendToBack,
    sendToFront,
    duplicate,
    createGroup,
    ungroup,
    shapes,
    mergeImages
  } = useStore();

  const [rotateStart, setRotateStart] = useState<{
    angle: number;
    startRotation: number;
  } | null>(null);

  const handleStickyInteraction = () => {
    if (shape.type === "sticky" && shape.isNew) {
      updateShape(shape.id, { isNew: false });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
// Add specific check for sticky note control panel elements
const isStickyControlsElement = (e.target as Element).closest(
  '[data-sticky-controls]'
);
const isCheckbox = (e.target as Element).tagName.toLowerCase() === 'input' &&
  (e.target as HTMLInputElement).type === 'checkbox';

if (isStickyControlsElement || isCheckbox) {
  e.stopPropagation();
  if (!selectedShapes.includes(shape.id)) {
    setSelectedShapes([shape.id]);
  }
  return;
}

if (shape.type === "3d" && shape.isOrbiting) {
  e.stopPropagation();
  return;
}

    if (tool === "pan" || (isEditing && !shape.isNew)) return;

     const controlsPanel = document.querySelector(
    `[data-controls-panel="${shape.id}"]`
  );
  if (controlsPanel?.contains(e.target as Node)) {
    e.stopPropagation();
    if (!selectedShapes.includes(shape.id)) {
      setSelectedShapes([shape.id]);
    }
    return;
  }

    e.stopPropagation();
    handleStickyInteraction();
    initDragStart(e);

    if (e.shiftKey) {
      const newSelection = selectedShapes.includes(shape.id)
        ? selectedShapes.filter((id) => id !== shape.id)
        : [...selectedShapes, shape.id];
      setSelectedShapes(newSelection);
    } else if (!selectedShapes.includes(shape.id)) {
      setSelectedShapes([shape.id]);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const menuItems = createShapeContextMenu(shape, selectedShapes, {
      sendBackward,
      sendForward,
      sendToBack,
      sendToFront,
      duplicate,
      deleteShape,
      createGroup,
      ungroup,
      mergeImages
    }, shapes);

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: menuItems,
    });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (tool === "pan") return;

    if (shape.type === "sticky" || shape.type === "text") {
      // Update both store states
      updateShape(shape.id, {
        isEditing: true,
        content: shape.content === "Double-Click to Edit..." ? "" : shape.content,
      });
      setIsEditingText(true);
      // Update selection
      setSelectedShapes([shape.id]);

      // Focus the textarea
      if (textRef.current) {
        requestAnimationFrame(() => {
          if (textRef.current) {
            textRef.current.focus();
            textRef.current.select();
          }
        });
      }

      handleStickyInteraction();

    } else if (shape.type === "3d") {
      // Toggle orbiting for 3D shapes
      updateShape(shape.id, {
        isOrbiting: !shape.isOrbiting
      });
      setSelectedShapes([shape.id]);
    }

  };


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedShapes.includes(shape.id)) {
      if (e.key === "Delete") {
        deleteShape(shape.id);
      } else if (e.shiftKey && e.key === "Enter") {
        setIsEditingText(false);
        setSelectedShapes([]);
      }
    }
  };

  const handleRotateStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);

    setRotateStart({
      angle: startAngle,
      startRotation: shape.rotation || 0,
    });
  };

  useEffect(() => {
    if (!rotateStart) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = document.getElementById(shape.id)?.getBoundingClientRect();
      if (!rect) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const angleDiff = (currentAngle - rotateStart.angle) * (180 / Math.PI);
      const newRotation = (rotateStart.startRotation + angleDiff) % 360;

      updateShape(shape.id, { rotation: newRotation });
    };

    const handleMouseUp = () => {
      setRotateStart(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [rotateStart, shape.id, updateShape]);

  return {
    handleMouseDown,
    handleContextMenu,
    handleDoubleClick,
    handleKeyDown,
    handleRotateStart,
  };
}

