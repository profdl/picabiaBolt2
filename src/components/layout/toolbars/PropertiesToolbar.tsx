import React from 'react';
import {
  ArrowLeftRight,
  Blend,
  Forward,
  Maximize2,
  RotateCw,
} from "lucide-react";
import { useThemeClass } from "../../../styles/useThemeClass";
import { BrushShapeSelector } from "./BrushShapeSelector";

interface PropertiesToolbarProps {
  type: 'brush' | 'eraser' | 'shape'; // Add more types as needed
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

export const PropertiesToolbar: React.FC<PropertiesToolbarProps> = ({
  type,
  properties,
  onPropertyChange,
}) => {
  const styles = {
    container: useThemeClass(["toolbar", "container"]),
    controls: {
      container: useThemeClass(["toolbar", "controls", "container"]),
      label: useThemeClass(["toolbar", "controls", "label"]),
      input: useThemeClass(["toolbar", "controls", "input"]),
    },
  };

  const sliderBaseStyles = {
    pointerEvents: "all" as const,
    height: "2px",
    backgroundColor: "rgb(229 231 235)",
    borderRadius: "9999px",
    appearance: "none" as const,
    outline: "none",
  };

  if (type !== 'brush' && type !== 'eraser') return null;

  return (
    <div className={`absolute bottom-full mb-2.5 left-1/2 transform -translate-x-1/2 ${styles.container} min-w-max rounded-lg`}>
      <div className="p-0 flex items-center gap-3">
        {/* Color Picker */}
        <div className="relative">
          <input
            type="color"
            value={properties.color}
            onChange={(e) => onPropertyChange('color', e.target.value)}
            className="w-8 h-8 p-0 bg-transparent rounded cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none border border-gray-300 dark:border-gray-600"
            title="Brush Color"
          />
        </div>

        {/* Brush Shape Selector */}
        <BrushShapeSelector
          currentTexture={properties.texture || 'basic'}
          onTextureSelect={(texture) => onPropertyChange('texture', texture)}
        />

        <div className="p-0 flex items-center gap-4 flex-nowrap pl-2">
          {/* Size Control */}
          <div className={`${styles.controls.container} w-[80px]`}>
            <div className="flex items-center gap-2">
              <Maximize2 className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
              <div className="relative flex-1" style={{ height: "18px" }}>
                <input
                  type="range"
                  value={properties.size}
                  onChange={(e) => onPropertyChange('size', Number(e.target.value))}
                  min="1"
                  max="100"
                  className="mini-slider absolute top-1/2 -translate-y-1/2 w-full"
                  style={sliderBaseStyles}
                  title="Size"
                />
              </div>
            </div>
          </div>

          {/* Opacity Control */}
          <div className={`${styles.controls.container} w-[80px]`}>
            <div className="flex items-center gap-2">
              <Blend className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
              <div className="relative flex-1" style={{ height: "18px" }}>
                <input
                  type="range"
                  value={properties.opacity}
                  onChange={(e) => onPropertyChange('opacity', Number(e.target.value))}
                  min="0"
                  max="1"
                  step="0.1"
                  className="mini-slider absolute top-1/2 -translate-y-1/2 w-full"
                  style={sliderBaseStyles}
                  title="Opacity"
                />
              </div>
            </div>
          </div>

          {/* Rotation Control */}
          <div className={`${styles.controls.container} w-[80px]`}>
            <div className="flex items-center gap-2">
              <RotateCw className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
              <div className="relative flex-1" style={{ height: "18px" }}>
                <input
                  type="range"
                  value={properties.rotation}
                  onChange={(e) => onPropertyChange('rotation', Number(e.target.value))}
                  min="0"
                  max="360"
                  className="mini-slider absolute top-1/2 -translate-y-1/2 w-full"
                  style={sliderBaseStyles}
                  title="Rotation"
                />
              </div>
            </div>
          </div>

          {/* Follow Path Toggle */}
          <div className={styles.controls.container}>
            <div className="flex items-center gap-1">
              <input
                type="checkbox"
                id="brushFollowPath"
                checked={properties.followPath}
                onChange={(e) => onPropertyChange('followPath', e.target.checked)}
                className="w-3 h-3 text-neutral-600 dark:text-neutral-400 rounded border-neutral-300 dark:border-neutral-700"
              />
              <Forward className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
            </div>
          </div>

          {/* Spacing Control */}
          <div className={`${styles.controls.container} w-[80px]`}>
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
              <div className="relative flex-1" style={{ height: "18px" }}>
                <input
                  type="range"
                  value={properties.spacing ? properties.spacing * 100 : 0}
                  onChange={(e) => onPropertyChange('spacing', Number(e.target.value) / 100)}
                  min="5"
                  max="100"
                  className="mini-slider absolute top-1/2 -translate-y-1/2 w-full"
                  style={sliderBaseStyles}
                  title="Spacing"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};