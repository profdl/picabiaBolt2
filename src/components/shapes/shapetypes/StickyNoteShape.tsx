import { Shape } from '../../../types';
import { StickyNoteShape as StickyNoteShapeType } from '../../../types/shapes';
import { useThemeClass } from '../../../styles/useThemeClass';
import { useStore } from '../../../store';
import { useStickyNoteColor } from '../../../hooks/ui/useStickyNoteColor';
import { useDarkMode } from '../../../hooks/ui/useDarkMode';
import { shapeLayout } from '../../../utils/shapeLayout';

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

  // Type check and cast the shape
  const stickyShape = shape.type === "sticky" ? (shape as StickyNoteShapeType) : null;
  if (!stickyShape) return null;

  const getTextColor = () => {
    if (isDark) {
      if (stickyShape.showPrompt) {
        return 'text-emerald-100';
      } else if (stickyShape.showNegativePrompt) {
        return 'text-red-100';
      }
      return 'text-amber-100';
    }
    return 'text-neutral-800';
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const minSize = shapeLayout.calculateTextContentSize(newContent, stickyShape.fontSize || 16);
    updateShape(stickyShape.id, {
      content: newContent,
      width: Math.max(stickyShape.width, minSize.width),
      height: Math.max(stickyShape.height, minSize.height)
    });
  };

  return (
    <textarea
      ref={textRef}
      value={stickyShape.content || ""}
      onChange={handleContentChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`${styles} ${
        isEditing ? "cursor-text" : "cursor-move"
      } ${getTextColor()} w-full h-full resize-none p-3`}
      style={{
        fontSize: stickyShape.fontSize || 16,
        scrollbarWidth: "thin",
        pointerEvents: "all",
        backgroundColor,
        border: "none",
        outline: "none",
        boxShadow: `0 1px 3px rgba(0,0,0,0.12)`,
        borderRadius: "4px",
        wordWrap: "break-word",
        overflowWrap: "break-word",
        whiteSpace: "pre-wrap",
      }}
      readOnly={!isEditing}
      spellCheck={false}
    />
  );
};