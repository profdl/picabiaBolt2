import React, { useState, useCallback } from "react";
import { BrushSettingsPanel } from "./BrushShapeSelector";
import { OKColorPicker } from "../../shared/hsl-color-picker";
import { NumberInput } from "../../shared/NumberInput";
import { useStore } from "../../../store";

interface BrushPropertiesToolbarProps {
  properties: {
    color?: string;
    texture?: string;
    size?: number;
    opacity?: number;
    rotation?: number;
    followPath?: boolean;
    spacing?: number;
    hardness?: number;
  };
  onPropertyChange: (property: string, value: unknown) => void;
}

export const BrushPropertiesToolbar: React.FC<BrushPropertiesToolbarProps> = ({
  properties,
  onPropertyChange,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const { tool } = useStore((state) => ({
    tool: state.tool,
  }));

  const styles = {
    buttonGroup: "flex items-center gap-1",
    divider: "w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1.5",
    controlGroup: {
      container: "flex items-center gap-1",
      label:
        "text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase",
    },
    colorPicker: {
      trigger:
        "w-8 h-8 p-0 bg-transparent rounded cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none border border-neutral-300 dark:border-neutral-600",
      popup: "absolute bottom-[calc(100%+0.5rem)] left-0 z-[60]",
    },
  };

  const handleColorChange = useCallback(
    (color: string) => {
      onPropertyChange("color", color);
    },
    [onPropertyChange]
  );

  return (
    <div className="flex items-center gap-3">
      {tool === "brush" && (
        <>
          <div className="flex items-center gap-3 relative">
            <div
              className={styles.colorPicker.trigger}
              onClick={() => setShowColorPicker(!showColorPicker)}
              style={{ backgroundColor: properties.color }}
            />

            {showColorPicker && (
              <div className={styles.colorPicker.popup}>
                <div
                  className="fixed inset-0"
                  onClick={() => setShowColorPicker(false)}
                />
                <OKColorPicker
                  value={properties.color}
                  onChange={handleColorChange}
                  defaultColor={{
                    hue: 0,
                    saturation: 100,
                    lightness: 50,
                  }}
                />
              </div>
            )}
            <BrushSettingsPanel
              currentTexture={properties.texture || "basic"}
              rotation={properties.rotation}
              spacing={properties.spacing}
              followPath={properties.followPath}
              onTextureSelect={(texture) => onPropertyChange("texture", texture)}
              onPropertyChange={onPropertyChange}
            />
          </div>
          <div className={styles.divider} />
        </>
      )}

      <div className="flex items-center gap-6">
        <div className={styles.controlGroup.container}>
          <span className={styles.controlGroup.label}>Size</span>
          <NumberInput
            value={properties.size || 1}
            onChange={(value) => onPropertyChange("size", value)}
            min={1}
            max={100}
            step={1}
            formatValue={(v) => `${Math.round(v)}`}
          />
        </div>

        {tool === "brush" && (
          <div className={styles.controlGroup.container}>
            <span className={styles.controlGroup.label}>Opacity</span>
            <NumberInput
              value={(properties.opacity || 0) * 100}
              onChange={(value) => onPropertyChange("opacity", value / 100)}
              min={0}
              max={100}
              step={1}
              formatValue={(v) => `${Math.round(v)}%`}
            />
          </div>
        )}
        {tool === "brush" && properties.texture === 'soft' && (
          <div className={styles.controlGroup.container}>
            <span className={styles.controlGroup.label}>Hardness</span>
            <NumberInput
              value={Math.round((properties.hardness ?? 1) * 100)}
              onChange={(value) => onPropertyChange("hardness", value / 100)}
              min={1}
              max={100}
              step={1}
              formatValue={(v) => `${Math.round(v)}%`}
            />
          </div>
        )}
      </div>
    </div>
  );
};
