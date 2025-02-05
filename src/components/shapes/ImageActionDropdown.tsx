import {
  ChevronDown,
  Download,
  Crop,
  Eraser,
  ArrowDown,
  ArrowUp,
  MoveDown,
  MoveUp,
  ChevronRight,
  Trash2,
  Box,
} from "lucide-react";
import { useStore } from "../../store";
import { Shape } from "../../types";
import { useState } from "react";
import { useThemeClass } from '../../styles/useThemeClass';

interface ImageActionDropdownProps {
  shape: Shape;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (isOpen: boolean) => void;
  onSelectSubject: (e: React.MouseEvent) => void;
  onCrop: (e: React.MouseEvent) => void;
  onDownload: (e: React.MouseEvent) => void;
  sendForward: () => void;
  sendBackward: () => void;
  sendToFront: () => void;
  sendToBack: () => void;
  deleteShape: () => void;
}

export function ImageActionDropdown({
  isDropdownOpen,
  setIsDropdownOpen,
  onSelectSubject,
  onCrop,
  onDownload,
  sendForward,
  sendBackward,
  sendToFront,
  sendToBack,
  deleteShape,
  shape,
}: ImageActionDropdownProps) {
  const styles = {
    button: useThemeClass(['dropdown', 'button']),
    menu: useThemeClass(['dropdown', 'menu']),
    item: useThemeClass(['dropdown', 'item']),
    submenu: useThemeClass(['dropdown', 'submenu']),
    icon: useThemeClass(['dropdown', 'icon']),
    deleteButton: useThemeClass(['dropdown', 'deleteButton']),
    deleteIcon: useThemeClass(['dropdown', 'deleteIcon'])
  };

  const [showArrangeMenu, setShowArrangeMenu] = useState(false);
  
  const handleAction = (action: (e: React.MouseEvent) => void) => {
    action(new MouseEvent("click") as unknown as React.MouseEvent);
    setIsDropdownOpen(false);
  };

  const { create3DDepth } = useStore((state) => ({
    create3DDepth: state.create3DDepth,
  }));

  const onSelect3DDepth = (shape: Shape) => {
    if (shape.depthPreviewUrl) {
      const newX = shape.position.x + shape.width + 20;
      create3DDepth(shape, {
        x: newX,
        y: shape.position.y,
      });
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        className={styles.button}
        onClick={(e) => {
          e.stopPropagation();
          setIsDropdownOpen(!isDropdownOpen);
        }}
      >
        <span className="text-xs">ACTIONS...</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isDropdownOpen && (
        <div className={styles.menu} style={{ zIndex: 1002 }}>
          <div
            className={`${styles.item} justify-between`}
            onMouseEnter={() => setShowArrangeMenu(true)}
            onMouseLeave={() => setShowArrangeMenu(false)}
          >
            <span className="flex items-center gap-2">
              <MoveUp className={styles.icon} />
              Arrange
            </span>
            <ChevronRight className={styles.icon} />

            {showArrangeMenu && (
              <div className={styles.submenu}>
                <button
                  className={styles.item}
                  onClick={() => handleAction(sendForward)}
                >
                  <ArrowUp className={styles.icon} />
                  Send Forward
                </button>
                <button
                  className={styles.item}
                  onClick={() => handleAction(sendBackward)}
                >
                  <ArrowDown className={styles.icon} />
                  Send Backward
                </button>
                <button
                  className={styles.item}
                  onClick={() => handleAction(sendToFront)}
                >
                  <MoveUp className={styles.icon} />
                  Send to Front
                </button>
                <button
                  className={styles.item}
                  onClick={() => handleAction(sendToBack)}
                >
                  <MoveDown className={styles.icon} />
                  Send to Back
                </button>
              </div>
            )}
          </div>

          <button
            className={styles.item}
            onClick={() => handleAction(onSelectSubject)}
          >
            <Eraser className={styles.icon} />
            Remove Background
          </button>
          <button
            className={styles.item}
            onClick={() => handleAction(() => onSelect3DDepth(shape))}
          >
            <Box className={styles.icon} />
            3D Depth
          </button>
          <button
            className={styles.item}
            onClick={() => handleAction(onCrop)}
          >
            <Crop className={styles.icon} />
            Crop
          </button>
          <button
            className={styles.item}
            onClick={() => handleAction(onDownload)}
          >
            <Download className={styles.icon} />
            Download
          </button>
          <button
            className={styles.deleteButton}
            onClick={() => handleAction(deleteShape)}
          >
            <Trash2 className={styles.deleteIcon} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}