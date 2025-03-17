import { useThemeClass } from "../../styles/useThemeClass";
import { MiniToggle } from "./MiniToggle";
import { SmallSlider } from "./SmallSlider";

interface EnableReferencePanelProps {
  id: string;
  label: string;
  checked: boolean;
  onToggleChange: (checked: boolean) => void;
  sliderValue: number;
  onSliderChange: (value: number) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  showSlider?: boolean;
}

export function EnableReferencePanel({
  id,
  label,
  checked,
  onToggleChange,
  sliderValue,
  onSliderChange,
  onMouseDown,
  onClick,
  showSlider = true
}: EnableReferencePanelProps) {
  const styles = {
    sidePanel: {
      container: useThemeClass(["shape", "sidePanel", "container"]),
      group: useThemeClass(["shape", "sidePanel", "group"]),
    },
  };

  return (
    <div className="mb-1">
      <div
        className={`${styles.sidePanel.container} p-0`}
        style={{ minWidth: "140px", width: "max-content" }}
        data-shape-control="true"
        onMouseDown={onMouseDown}
        onClick={onClick}
      >
        <div className="py-[2px]">
          <div className={`${styles.sidePanel.group} w-full px-1`}>
            <MiniToggle
              id={id}
              checked={checked}
              onChange={onToggleChange}
              label={label}
            />
          </div>
        </div>
        {checked && showSlider && (
          <div className="w-full pl-[2px] pr-2 pt-1 pb-2">
            <SmallSlider
              value={sliderValue}
              onChange={onSliderChange}
              min={0.05}
              max={1.00}
              step={0.05}
              label="Strength"
            />
          </div>
        )}
      </div>
    </div>
  );
} 