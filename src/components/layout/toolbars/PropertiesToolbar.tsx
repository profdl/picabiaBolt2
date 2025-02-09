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
import { ToolbarButton } from '../../shared/ToolbarButton';

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
    container: "absolute bottom-full mb-2.5 left-1/2 transform -translate-x-1/2 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-1.5",
    buttonGroup: "flex items-center gap-1",
    button: useThemeClass(["toolbar", "button", "base"]),
    activeButton: useThemeClass(["toolbar", "button", "active"]),
    divider: "w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1.5",
    slider: {
      container: "flex items-center gap-2 w-[80px]",
      input: "mini-slider w-full pointer-events-all h-[2px] bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none outline-none"
    },
    colorPicker: "w-8 h-8 p-0 bg-transparent rounded cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none border border-neutral-300 dark:border-neutral-600"
  };

  if (type === 'image' || type === 'shape') {
    if (!shape || !actions) return null;

    const selectedShapeObjects = shapes.filter(s => selectedShapes.includes(s.id));
    const areAllImages = selectedShapeObjects.length > 1 && 
      selectedShapeObjects.every(s => s.type === "image");

    return (
      <div className={styles.container}>
        <div className={styles.buttonGroup}>
          <Tooltip content="Send Backward" side="top">
            <ToolbarButton
              icon={<ArrowDown className="w-4 h-4" />}
              onClick={actions.sendBackward}
              className={styles.button}
            />
          </Tooltip>

          <Tooltip content="Send Forward" side="top">
            <ToolbarButton
              icon={<ArrowUp className="w-4 h-4" />}
              onClick={actions.sendForward}
              className={styles.button}
            />
          </Tooltip>

          <Tooltip content="Send to Back" side="top">
            <ToolbarButton
              icon={<MoveDown className="w-4 h-4" />}
              onClick={actions.sendToBack}
              className={styles.button}
            />
          </Tooltip>

          <Tooltip content="Send to Front" side="top">
            <ToolbarButton
              icon={<MoveUp className="w-4 h-4" />}
              onClick={actions.sendToFront}
              className={styles.button}
            />
          </Tooltip>

          <div className={styles.divider} />

          <Tooltip content="Duplicate" side="top">
            <ToolbarButton
              icon={<Copy className="w-4 h-4" />}
              onClick={actions.duplicate}
              className={styles.button}
            />
          </Tooltip>

          <Tooltip content="Delete" side="top">
            <ToolbarButton
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => actions.deleteShape(shape.id)}
              className={styles.button}
            />
          </Tooltip>

          {selectedShapes.length > 1 && (
            <Tooltip content="Group Shapes" side="top">
              <ToolbarButton
                icon={<Group className="w-4 h-4" />}
                onClick={() => actions.createGroup(selectedShapes)}
                className={styles.button}
              />
            </Tooltip>
          )}

          {shape.type === "group" && (
            <Tooltip content="Ungroup" side="top">
              <ToolbarButton
                icon={<Ungroup className="w-4 h-4" />}
                onClick={() => actions.ungroup(shape.id)}
                className={styles.button}
              />
            </Tooltip>
          )}

          {areAllImages && (
            <>
              <div className={styles.divider} />
              <Tooltip content="Merge Images" side="top">
                <ToolbarButton
                  icon={<Layers className="w-4 h-4" />}
                  onClick={() => actions.mergeImages(selectedShapes)}
                  className={styles.button}
                />
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
      <div className={styles.container}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={properties.color}
              onChange={(e) => onPropertyChange('color', e.target.value)}
              className={styles.colorPicker}
              title="Brush Color"
            />

            <BrushShapeSelector
              currentTexture={properties.texture || 'basic'}
              onTextureSelect={(texture) => onPropertyChange('texture', texture)}
            />
          </div>

          <div className={styles.divider} />

          <div className="flex items-center gap-4">
            <div className={styles.slider.container}>
              <Maximize2 className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
              <input
                type="range"
                value={properties.size}
                onChange={(e) => onPropertyChange('size', Number(e.target.value))}
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
                onChange={(e) => onPropertyChange('opacity', Number(e.target.value))}
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
                onChange={(e) => onPropertyChange('rotation', Number(e.target.value))}
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
                onChange={(e) => onPropertyChange('followPath', e.target.checked)}
                className="w-3 h-3 text-neutral-600 dark:text-neutral-400 rounded border-neutral-300 dark:border-neutral-700"
              />
              <Forward className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
            </div>

            <div className={styles.slider.container}>
              <ArrowLeftRight className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
              <input
                type="range"
                value={properties.spacing ? properties.spacing * 100 : 0}
                onChange={(e) => onPropertyChange('spacing', Number(e.target.value) / 100)}
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
  }

  return null;
};