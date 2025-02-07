import { Shape } from '../../../types';
import { useThemeClass } from '../../../styles/useThemeClass';
import { useStore } from '../../../store';
import { useStickyNoteColor } from '../../../hooks/useStickyNoteColor';
import { useDarkMode } from '../../../hooks/useDarkMode';

interface StickyNoteShapeProps {
  shape: Shape;
  isEditing: boolean;
  textRef: React.RefObject<HTMLTextAreaElement>;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleBlur: () => void;
}

export const StickyNoteShape: React.FC<StickyNoteShapeProps> = ({
  shape,
  isEditing,
  textRef,
  handleKeyDown,
  handleBlur,
}) => {
  const { updateShape } = useStore();
  const styles = useThemeClass(['shape', 'textArea']);
  const backgroundColor = useStickyNoteColor(shape);
  const { isDark } = useDarkMode();

  // Function to determine text color based on sticky note color and dark mode
  const getTextColor = () => {
    if (isDark) {
      if (shape.showPrompt) { // If it's a green sticky note
        return 'text-emerald-100'; // Light mint color
      } else if (shape.showNegativePrompt) { // If it's a red sticky note
        return 'text-red-100';
      }
      return 'text-amber-100'; // Default yellow sticky note
    }
    return 'text-neutral-800'; // Light mode color
  };

  return (
    <textarea
      ref={textRef}
      value={shape.content || ""}
      onChange={(e) => updateShape(shape.id, { content: e.target.value })}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`${styles} ${
        isEditing ? "cursor-text" : "cursor-move"
      } ${getTextColor()}`}
      style={{
        fontSize: shape.fontSize || 16,
        scrollbarWidth: "thin",
        pointerEvents: "all",
        backgroundColor,
        border: "none",
        outline: "none",
        boxShadow: `0 0 0 1px ${backgroundColor}`,
        borderRadius: "4px",
      }}
      readOnly={!isEditing}
      spellCheck={false}
    />
  );
};