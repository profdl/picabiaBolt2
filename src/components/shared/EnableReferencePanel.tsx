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
}

export function EnableReferencePanel({
  id,
  label,
  checked,
  onToggleChange,
  sliderValue,
  onSliderChange,
  onMouseDown,
  onClick
}: EnableReferencePanelProps) {
  const styles = {
    sidePanel: {
      container: useThemeClass(["shape", "sidePanel", "container"]),
      group: useThemeClass(["shape", "sidePanel", "group"]),
    },
  };

  return (
    <div
      className={`${styles.sidePanel.container}`}
      style={{ minWidth: "160px", width: "fit-content" }}
      data-shape-control="true"
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <div className="flex flex-col gap-1.5 pl-1 pr-2">
        <div className={styles.sidePanel.group}>
          <MiniToggle
            id={id}
            checked={checked}
            onChange={onToggleChange}
            label={label}
          />
        </div>
        <div className="flex items-center w-full -ml-1">
          <SmallSlider
            value={sliderValue}
            onChange={onSliderChange}
            min={0.05}
            max={1.00}
            step={0.05}
            label="Strength"
          />
        </div>
      </div>
    </div>
  );
} 