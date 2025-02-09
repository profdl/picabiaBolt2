import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  MoveDown,
  MoveUp,
  Copy,
  Trash2,
  Group,
  Ungroup,
  Layers,
  Blend,
  Forward,
  ArrowLeftRight,
  Maximize2,
  RotateCw,
} from "lucide-react";
import { useThemeClass } from '../../../styles/useThemeClass';
import { Shape } from '../../../types';
import { BrushShapeSelector } from './BrushShapeSelector';
import { Tooltip } from '../../shared/Tooltip';

interface PropertiesToolbarProps {
  type: 'brush' | 'eraser' | 'image' | 'shape';
  // For brush/eraser
  properties?: {
    color?: string;
    texture?: string;
    size?: number;
    opacity?: number;
    rotation?: number;
    followPath?: boolean;
    spacing?: number;
  };
  onPropertyChange?: (property: string, value: unknown) => void;
  // For image/shape
  shape?: Shape;
  selectedShapes?: string[];
  shapes?: Shape[];
  actions?: {
    sendBackward: () => void;
    sendForward: () => void;
    sendToBack: () => void;
    sendToFront: () => void;
    duplicate: () => void;
    deleteShape: (id: string) => void;
    createGroup: (ids: string[]) => void;
    ungroup: (id: string) => void;
    mergeImages: (ids: string[]) => Promise<void>;
  };
}

export const PropertiesToolbar: React.FC<PropertiesToolbarProps> = ({
  type,
  properties,
  onPropertyChange,
  shape,
  selectedShapes = [],
  shapes = [],
  actions
}) => {
  const styles = {
    container: useThemeClass(["toolbar", "container"]),
    controls: {
      container: useThemeClass(["toolbar", "controls", "container"]),
      label: useThemeClass(["toolbar", "controls", "label"]),
      input: useThemeClass(["toolbar", "controls", "input"]),
      button: useThemeClass(["toolbar", "controls", "button"])
    },
    divider: "w-px bg-neutral-200 dark:bg-neutral-700 mx-2"
  };

  const sliderBaseStyles = {
    pointerEvents: "all" as const,
    height: "2px",
    backgroundColor: "rgb(229 231 235)",
    borderRadius: "9999px",
    appearance: "none" as const,
    outline: "none",
  };

  if (type === 'image' || type === 'shape') {
    if (!shape || !actions) return null;

    const selectedShapeObjects = shapes.filter(s => selectedShapes.includes(s.id));
    const areAllImages = selectedShapeObjects.length > 1 && 
      selectedShapeObjects.every(s => s.type === "image");

    return (
      <div className="absolute bottom-full mb-2.5 left-1/2 transform -translate-x-1/2 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-2">
        <div className="flex items-center gap-1">
          <Tooltip content="Send Backward" side="top">
            <button
              onClick={actions.sendBackward}
              className={styles.controls.button}
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </Tooltip>

          <Tooltip content="Send Forward" side="top">
            <button
              onClick={actions.sendForward}
              className={styles.controls.button}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </Tooltip>

          <Tooltip content="Send to Back" side="top">
            <button
              onClick={actions.sendToBack}
              className={styles.controls.button}
            >
              <MoveDown className="w-4 h-4" />
            </button>
          </Tooltip>

          <Tooltip content="Send to Front" side="top">
            <button
              onClick={actions.sendToFront}
              className={styles.controls.button}
            >
              <MoveUp className="w-4 h-4" />
            </button>
          </Tooltip>

          <div className={styles.divider} />

          <Tooltip content="Duplicate" side="top">
            <button
              onClick={actions.duplicate}
              className={styles.controls.button}
            >
              <Copy className="w-4 h-4" />
            </button>
          </Tooltip>

          <Tooltip content="Delete" side="top">
            <button
              onClick={() => actions.deleteShape(shape.id)}
              className={styles.controls.button}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </Tooltip>

          {selectedShapes.length > 1 && (
            <Tooltip content="Group Shapes" side="top">
              <button
                onClick={() => actions.createGroup(selectedShapes)}
                className={styles.controls.button}
              >
                <Group className="w-4 h-4" />
              </button>
            </Tooltip>
          )}

          {shape.type === "group" && (
            <Tooltip content="Ungroup" side="top">
              <button
                onClick={() => actions.ungroup(shape.id)}
                className={styles.controls.button}
              >
                <Ungroup className="w-4 h-4" />
              </button>
            </Tooltip>
          )}

          {areAllImages && (
            <>
              <div className={styles.divider} />
              <Tooltip content="Merge Images" side="top">
                <button
                  onClick={() => actions.mergeImages(selectedShapes)}
                  className={styles.controls.button}
                >
                  <Layers className="w-4 h-4" />
                </button>
              </Tooltip>
            </>
          )}
        </div>
      </div>
    );
  }

  if (type === 'brush' || type === 'eraser') {
    if (!properties || !onPropertyChange) return null;

    return (
      <div className="absolute bottom-full mb-2.5 left-1/2 transform -translate-x-1/2 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-2">
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
                <input
                  type="range"
                  value={properties.size}
                  onChange={(e) => onPropertyChange('size', Number(e.target.value))}
                  min="1"
                  max="100"
                  className="mini-slider w-full"
                  style={sliderBaseStyles}
                  title="Size"
                />
              </div>
            </div>

            {/* Opacity Control */}
            <div className={`${styles.controls.container} w-[80px]`}>
              <div className="flex items-center gap-2">
                <Blend className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
                <input
                  type="range"
                  value={properties.opacity}
                  onChange={(e) => onPropertyChange('opacity', Number(e.target.value))}
                  min="0"
                  max="1"
                  step="0.1"
                  className="mini-slider w-full"
                  style={sliderBaseStyles}
                  title="Opacity"
                />
              </div>
            </div>

            {/* Rotation Control */}
            <div className={`${styles.controls.container} w-[80px]`}>
              <div className="flex items-center gap-2">
                <RotateCw className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
                <input
                  type="range"
                  value={properties.rotation}
                  onChange={(e) => onPropertyChange('rotation', Number(e.target.value))}
                  min="0"
                  max="360"
                  className="mini-slider w-full"
                  style={sliderBaseStyles}
                  title="Rotation"
                />
              </div>
            </div>

            {/* Follow Path Toggle */}
            <div className={styles.controls.container}>
              <div className="flex items-center gap-1">
                <input
                  type="checkbox"
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
                <input
                  type="range"
                  value={properties.spacing ? properties.spacing * 100 : 0}
                  onChange={(e) => onPropertyChange('spacing', Number(e.target.value) / 100)}
                  min="5"
                  max="100"
                  className="mini-slider w-full"
                  style={sliderBaseStyles}
                  title="Spacing"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};