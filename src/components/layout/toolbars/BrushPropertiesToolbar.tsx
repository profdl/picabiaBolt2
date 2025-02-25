import React, { useState, useCallback } from "react";

import { BrushShapeSelector } from "./BrushShapeSelector";
import { OKColorPicker } from "../../shared/hsl-color-picker";
import { NumberInput } from "../../shared/NumberInput";

interface BrushPropertiesToolbarProps {
  properties: {
    color?: string;
    texture?: string;
    size?: number;
    opacity?: number;
    rotation?: number;
    followPath?: boolean;
    spacing?: number;
  };
  onPropertyChange: (property: string, value: unknown) => void;
}

export const BrushPropertiesToolbar: React.FC<BrushPropertiesToolbarProps> = ({
  properties,
  onPropertyChange,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const styles = {
    container:
      "absolute bottom-full mb-2.5 left-1/2 transform -translate-x-1/2 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-1.5",
    buttonGroup: "flex items-center gap-1",
    divider: "w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1.5",
    controlGroup: {
      container: "flex items-center gap-1",
      label: "text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase ",
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
    <div className={styles.container}>
      <div className="flex items-center gap-3">
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
         <BrushShapeSelector
            currentTexture={properties.texture || "basic"}
            onTextureSelect={(texture) => onPropertyChange("texture", texture)}
          />
        </div>
        <div className={styles.divider} />

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

          <div className={styles.controlGroup.container}>
            <span className={styles.controlGroup.label}>Angle</span>
            <NumberInput
              value={properties.rotation || 0}
              onChange={(value) => onPropertyChange("rotation", value)}
              min={0}
              max={360}
              step={1}
              formatValue={(v) => `${Math.round(v)}°`}
            />
          </div>

          <div className={styles.controlGroup.container}>
            <span className={styles.controlGroup.label}>Follow</span>
            <input
              type="checkbox"
              checked={properties.followPath}
              onChange={(e) => onPropertyChange("followPath", e.target.checked)}
              className="w-3 h-3 text-neutral-600 dark:text-neutral-400 rounded border-neutral-300 dark:border-neutral-700"
            />
          </div>

          <div className={styles.controlGroup.container}>
            <span className={styles.controlGroup.label}>Space</span>
            <NumberInput
              value={(properties.spacing || 0) * 100}
              onChange={(value) => onPropertyChange("spacing", value / 100)}
              min={5}
              max={100}
              step={1}
              formatValue={(v) => `${Math.round(v)}%`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};