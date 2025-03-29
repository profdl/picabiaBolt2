import { Shape } from "../types";

export const getShapeStyles = (
  shape: Shape,
  isSelected: boolean,
  shapes: Shape[],
  tool: "select" | "pan" | "pen" | "brush" | "eraser" | "inpaint",
  isEditing?: boolean,
  isDark: boolean = false
): React.CSSProperties => {
  // Find if this shape is in a disabled group
  const isInDisabledGroup = shape.groupId && shapes.find(s => s.id === shape.groupId)?.groupEnabled === false;

  // Check if any controls are enabled
  const hasEnabledControls = 
    (shape.type === "image" && (shape.showImagePrompt || shape.makeVariations)) ||
    (shape.type === "depth" && shape.showDepth) ||
    (shape.type === "edges" && shape.showEdges) ||
    (shape.type === "pose" && shape.showPose) ||
    (shape.type === "sticky" && (shape.isTextPrompt || shape.isNegativePrompt)) ||
    (shape.type === "diffusionSettings" && shape.useSettings);

  return {
    position: "absolute",
    left: shape.position.x,
    top: shape.position.y,
    width: shape.width,
    height: shape.height,
    backgroundColor:
      shape.type === "group"
        ? isDark 
          ? "#1f1f1f"  // Dark mode group background - darker than panel/toolbar
          : "#f5f5f5"  // Light mode group background
        : shape.type === "image" || shape.color === "transparent"
        ? "transparent"
        : shape.color,
    overflow: "visible",
    transition: "box-shadow 0.2s ease-in-out, opacity 0.2s ease-in-out, border-color 0.2s ease-in-out",
    zIndex: shape.groupId
      ? 200 // Grouped objects always stay higher
      : shape.type === "group"
      ? 0 // Groups stay below their contents
      : isSelected
      ? 1000 // Selected non-grouped objects go to top
      : shapes.findIndex((s) => s.id === shape.id),
    pointerEvents: isInDisabledGroup ? "none" : (tool === "select" ? "all" : "none"),
    cursor: isInDisabledGroup ? "not-allowed" : (tool === "select" ? "move" : "default"),
    opacity: isInDisabledGroup ? 0.3 : 1,
    border:
      shape.type === "group"
        ? isDark
          ? "2px solid #333333"  // Dark mode group border - darker to match background
          : "2px solid #9CA3AF"  // Light mode group border - changed from dashed to solid
        : hasEnabledControls
        ? "2px solid #22c55e"  // Green border for enabled controls
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
    padding: "8px",
    boxShadow:
      shape.type === "sticky" ? "0 4px 6px rgba(0, 0, 0, 0.1)" : undefined,
    transform: `rotate(${shape.rotation || 0}deg)`,
  };
};
