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
  showVariations?: boolean;
  makeVariations?: boolean;
  onVariationsToggleChange?: (checked: boolean) => void;
  variationStrength?: number;
  onVariationStrengthChange?: (value: number) => void;
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
  showVariations,
  makeVariations,
  onVariationsToggleChange,
  variationStrength,
  onVariationStrengthChange,
  showSlider = true
}: EnableReferencePanelProps) {
  const styles = {
    sidePanel: {
      container: useThemeClass(["shape", "sidePanel", "container"]),
      group: useThemeClass(["shape", "sidePanel", "group"]),
    },
  };

  return (
    <div
      className={`${styles.sidePanel.container} p-0`}
      style={{ minWidth: "140px", width: "max-content" }}
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
      {checked && showSlider && (
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
      {showVariations && (
        <>
          <div className="h-[34px] flex">
            <div className={`${styles.sidePanel.group} w-full px-2 -mt-[14px]`}>
              <MiniToggle
                id={`${id}-variations`}
                checked={makeVariations || false}
                onChange={onVariationsToggleChange || (() => {})}
                label="Make Variations"
              />
            </div>
          </div>
          {makeVariations && (
            <div className="flex items-center w-full pl-[2px] pr-2 -mt-[6px]">
              <SmallSlider
                value={variationStrength || 0.75}
                onChange={onVariationStrengthChange || (() => {})}
                min={0.05}
                max={1.00}
                step={0.05}
                label="Denoise Strength"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
} 