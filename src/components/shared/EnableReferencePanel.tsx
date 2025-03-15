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
      className={`${styles.sidePanel.container} ${!checked && 'h-[34px]'} p-0`}
      style={{ minWidth: "140px", width: "fit-content" }}
      data-shape-control="true"
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <div className="h-[34px] flex">
        <div className={`${styles.sidePanel.group} w-full px-2 -mt-[14px]`}>
          <MiniToggle
            id={id}
            checked={checked}
            onChange={onToggleChange}
            label={label}
          />
        </div>
      </div>
      {checked && (
        <div className="flex items-center w-full pl-[2px] pr-2 -mt-[6px]">
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
  );
} 