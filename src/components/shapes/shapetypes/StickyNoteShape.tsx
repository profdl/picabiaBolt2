import { Shape } from '../../../types';
import { useThemeClass } from '../../../styles/useThemeClass';
import { useStore } from '../../../store';

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

  return (
    <textarea
      ref={textRef}
      value={shape.content || ""}
      onChange={(e) => updateShape(shape.id, { content: e.target.value })}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`${styles} ${
        isEditing ? "cursor-text" : "cursor-move"
      } text-neutral-800`}
      style={{
        fontSize: shape.fontSize || 16,
        scrollbarWidth: "thin",
        pointerEvents: "all",
      }}
      readOnly={!isEditing}
      spellCheck={false}
    />
  );
};