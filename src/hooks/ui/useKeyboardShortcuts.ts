import { useEffect, useCallback } from "react";
import { useStore } from "../../store";

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
    setSelectedShapes,
    updateShape,
    setIsEditingText,
    isEditingText, // Add this from store
  } = useStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;

      // Check for all search inputs and navbar inputs
      const isSearchInput = 
        (e.target as HTMLElement)?.classList?.contains('assets-drawer-search') ||
        (e.target as HTMLElement)?.classList?.contains('sourceplus-search-input') ||
        // Check if the element is within the navbar
        (e.target as HTMLElement)?.closest('nav');
      
      // Return early if we're in any search input, navbar input, or editing text in an input
      if ((isInput && isEditingText) || isSearchInput) return;



      const isPrintableKey = e.key.length === 1 && !e.ctrlKey && !e.metaKey;
      const selectedShape = shapes.find((s) => selectedShapes.includes(s.id));

      // Only allow text input if shape is in editing mode
      if (
        isPrintableKey &&
        selectedShape &&
        (selectedShape.type === "text" || selectedShape.type === "sticky") &&
        selectedShape.isEditing
      ) {
        e.preventDefault();
        setIsEditingText(true);
        updateShape(selectedShape.id, {
          content: (selectedShape.content || "") + e.key,
        });
        return;
      }

      // Space for pan tool
      if (e.code === "Space") {
        e.preventDefault();
        setTool("pan");
      }

      // Single key shortcuts (when no modifier keys are pressed)
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "v":
            e.preventDefault();
            setTool("select");
            break;
         
          case "escape":
            e.preventDefault();
            setSelectedShapes([]);
            break;
        }
      }

      // Command/Control shortcuts
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case "c": // Copy
            e.preventDefault();
            if (selectedShapes.length > 0) {
              copyShapes();
            }
            break;

          case "x": // Cut
            e.preventDefault();
            if (selectedShapes.length > 0 && !isEditingText) {
              cutShapes();
            }
            break;

          case "v": // Paste
            e.preventDefault();
            pasteShapes();
            break;

          case "z": // Undo/Redo
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;

          case "a": // Select all
            e.preventDefault();
            if (shapes?.length) {
              setSelectedShapes(shapes.map((shape) => shape.id));
            }
            break;
        }
      }

      // Delete/Backspace - only if not editing text
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedShapes.length > 0 &&
        !isEditingText
      ) {
        e.preventDefault();
        deleteShapes(selectedShapes);
      }
    },
    [
      isEditingText,
      shapes,
      selectedShapes,
      setIsEditingText,
      updateShape,
      setTool,
      setSelectedShapes,
      pasteShapes,
      copyShapes,
      cutShapes,
      redo,
      undo,
      deleteShapes,
    ]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setTool("select");
      }
    },
    [setTool]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
}
