import { ChevronDown } from "lucide-react";
import { useStore } from "../../store";
import { Shape } from "../../types";
import { useState } from "react";
import { useThemeClass } from "../../styles/useThemeClass";
import { Tooltip } from "../shared/Tooltip";
import { getControlDescription, ControlType } from "../../utils/tooltips";

interface ImageActionDropdownProps {
  shape: Shape;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (isOpen: boolean) => void;
}

export function ImageActionDropdown({
  isDropdownOpen,
  setIsDropdownOpen,
  shape,
}: ImageActionDropdownProps) {
  const styles = {
    button: useThemeClass(["dropdown", "button"]),
    menu: useThemeClass(["dropdown", "menu"]),
    item: useThemeClass(["dropdown", "item"]),
    icon: useThemeClass(["dropdown", "icon"]),
  };

  const { updateShape, generatePreprocessedImage } = useStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const controls = [
    { type: "Depth", showKey: "showDepth", processType: "depth" },
    { type: "Edges", showKey: "showEdges", processType: "edge" },
    { type: "Pose", showKey: "showPose", processType: "pose" },
    { type: "Sketch", showKey: "showSketch", processType: "sketch" },
    { type: "Remix", showKey: "showRemix", processType: "remix" },
  ];

  const handleSelectControl = async (control: (typeof controls)[0]) => {
    if (!control.showKey || !control.processType) return;
    setIsProcessing(true);

    const isEnabled = !shape[control.showKey as keyof Shape];
    updateShape(shape.id, { [control.showKey]: isEnabled });

    if (isEnabled && !shape[`${control.processType}PreviewUrl` as keyof Shape]) {
      try {
        await generatePreprocessedImage(shape.id, control.processType);
      } catch (error) {
        console.error("Failed to generate preprocessed image:", error);
        updateShape(shape.id, { [control.showKey]: false });
      }
    }
    setIsProcessing(false);
    setIsDropdownOpen(false);
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
        <span className="text-xs">SHAPE CONTROLS...</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isDropdownOpen && (
        <div className={styles.menu} style={{ zIndex: 1002 }}>
          {controls.map((control) => (
            <Tooltip
              key={control.type}
              content={
                <div>
                  <h4 className="font-medium mb-1">{control.type}</h4>
                  <p>{getControlDescription(control.type as ControlType)}</p>
                </div>
              }
            >
              <button
                className={styles.item}
                onClick={() => handleSelectControl(control)}
                disabled={isProcessing}
              >
                {control.type}
              </button>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}
