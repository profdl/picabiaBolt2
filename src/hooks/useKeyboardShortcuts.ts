import { useEffect, useCallback } from 'react';
import { useStore } from '../store';

export function useKeyboardShortcuts() {
  const {
    selectedShapes,
    shapes,
    setTool,
    copyShapes,
    cutShapes,
    pasteShapes,
    deleteShapes,
    undo,
    redo,
    setSelectedShapes
  } = useStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore shortcuts when typing in input fields
    const isInput = e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement;
    if (isInput) return;

    // Space for pan tool
    if (e.code === 'Space') {
      e.preventDefault();
      setTool('pan');
    }

    // Single key shortcuts (when no modifier keys are pressed)
    if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      switch (e.key.toLowerCase()) {
        case 'v':
          e.preventDefault();
          setTool('select');
          break;
        case 'p':
          e.preventDefault();
          setTool('pen');
          break;
        case 'escape':
          e.preventDefault();
          setSelectedShapes([]);
          break;
      }
    }

    // Command/Control shortcuts
    if ((e.metaKey || e.ctrlKey) && !e.altKey) {
      switch (e.key.toLowerCase()) {
        case 'c': // Copy
          e.preventDefault();
          if (selectedShapes.length > 0) {
            copyShapes();
          }
          break;

        case 'x': // Cut
          e.preventDefault();
          if (selectedShapes.length > 0) {
            cutShapes();
          }
          break;

        case 'v': // Paste
          e.preventDefault();
          pasteShapes();
          break;

        // case 'z': // Undo/Redo
        //   e.preventDefault();
        //   if (e.shiftKey) {
        //     redo();
        //   } else {
        //     undo();
        //   }
        //   break;

        case 'a': // Select all
          e.preventDefault();
          if (shapes?.length) {
            setSelectedShapes(shapes.map(shape => shape.id));
          }
          break;
      }
    }

    // Delete/Backspace
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShapes.length > 0) {
      e.preventDefault();
      deleteShapes(selectedShapes);
    }
  }, [selectedShapes, shapes, setTool, copyShapes, cutShapes, pasteShapes, deleteShapes, undo, redo, setSelectedShapes]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      setTool('select');
    }
  }, [setTool]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
}