import React from "react";
import {
  Maximize2,
  Blend,
  RotateCw,
  Forward,
  ArrowLeftRight,
} from "lucide-react";
import { BrushShapeSelector } from "./BrushShapeSelector";

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
  const styles = {
    container:
      "absolute bottom-full mb-2.5 left-1/2 transform -translate-x-1/2 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-1.5",
    buttonGroup: "flex items-center gap-1",
    divider: "w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1.5",
    slider: {
      container: "flex items-center gap-2 w-[80px]",
      input:
        "mini-slider w-full pointer-events-all h-[2px] bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none outline-none",
    },
    colorPicker:
      "w-8 h-8 p-0 bg-transparent rounded cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none border border-neutral-300 dark:border-neutral-600",
  };

  return (
    <div className={styles.container}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={properties.color}
            onChange={(e) => onPropertyChange("color", e.target.value)}
            className={styles.colorPicker}
            title="Brush Color"
          />

          <BrushShapeSelector
            currentTexture={properties.texture || "basic"}
            onTextureSelect={(texture) => onPropertyChange("texture", texture)}
          />
        </div>

        <div className={styles.divider} />

        <div className="flex items-center gap-4">
          <div className={styles.slider.container}>
            <Maximize2 className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
            <input
              type="range"
              value={properties.size}
              onChange={(e) => onPropertyChange("size", Number(e.target.value))}
              min="1"
              max="100"
              className={styles.slider.input}
              title="Size"
            />
          </div>

          <div className={styles.slider.container}>
            <Blend className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
            <input
              type="range"
              value={properties.opacity}
              onChange={(e) => onPropertyChange("opacity", Number(e.target.value))}
              min="0"
              max="1"
              step="0.1"
              className={styles.slider.input}
              title="Opacity"
            />
          </div>

          <div className={styles.slider.container}>
            <RotateCw className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
            <input
              type="range"
              value={properties.rotation}
              onChange={(e) =>
                onPropertyChange("rotation", Number(e.target.value))
              }
              min="0"
              max="360"
              className={styles.slider.input}
              title="Rotation"
            />
          </div>

          <div className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={properties.followPath}
              onChange={(e) => onPropertyChange("followPath", e.target.checked)}
              className="w-3 h-3 text-neutral-600 dark:text-neutral-400 rounded border-neutral-300 dark:border-neutral-700"
            />
            <Forward className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
          </div>

          <div className={styles.slider.container}>
            <ArrowLeftRight className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
            <input
              type="range"
              value={properties.spacing ? properties.spacing * 100 : 0}
              onChange={(e) =>
                onPropertyChange("spacing", Number(e.target.value) / 100)
              }
              min="5"
              max="100"
              className={styles.slider.input}
              title="Spacing"
            />
          </div>
        </div>
      </div>
    </div>
  );
};