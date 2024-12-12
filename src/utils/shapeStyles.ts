import { Shape } from "../types";

export const getShapeStyles = (
  shape: Shape,
  isSelected: boolean,
  shapes: Shape[],
  tool: "select" | "pan" | "pen" | "brush" | "eraser",
  isEditing?: boolean
): React.CSSProperties => {
  return {
    position: "absolute",
    left: shape.position.x,
    top: shape.position.y,
    width: shape.width,
    height: shape.height,
    backgroundColor:
      shape.type === "group"
        ? "white"
        : shape.type === "image" || shape.color === "transparent"
        ? "transparent"
        : shape.color,
    overflow: "visible",
    transition: "box-shadow 0.2s ease-in-out",
    zIndex: shape.groupId
      ? 200 // Grouped objects always stay higher
      : shape.type === "group"
      ? 0 // Groups stay below their contents
      : isSelected
      ? 1000 // Selected non-grouped objects go to top
      : shapes.findIndex((s) => s.id === shape.id),
    pointerEvents: tool === "select" ? "all" : "none",
    cursor: tool === "select" ? "move" : "default",
    border:
      shape.type === "group"
        ? "2px dashed #9CA3AF" // Gray dashed border for groups
        : shape.type === "sticky"
        ? isEditing
          ? "3px solid rgba(128, 128, 255, 1)"
          : isSelected
          ? "2px solid #2196f3"
          : "none"
        : isSelected
        ? "2px solid #2196f3"
        : "none",
    borderRadius: shape.type === "sticky" ? "8px" : "4px",
    display: "absolute",
    alignItems: "center",
    justifyContent: "center",
    userSelect: "none",
    fontSize: shape.fontSize || 16,
    padding: "8px",
    boxShadow:
      shape.type === "sticky" ? "0 4px 6px rgba(0, 0, 0, 0.1)" : undefined,
    transform: `rotate(${shape.rotation || 0}deg)`,
  };
};
