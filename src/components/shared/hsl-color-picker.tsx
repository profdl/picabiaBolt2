import { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { converter, Color as CuloriColor } from 'culori';

interface Color {
  hue: number;  // 0-360
  saturation: number;  // 0-100 
  lightness: number;  // 0-100
}

interface OKColorPickerProps {
  value?: string;
  onChange?: (color: string) => void;
}

const rgbToOkhsl = converter('okhsl');
const okhslToRgb = converter('rgb');

// Utility functions defined before use
const hexToRgb = (hex: string): CuloriColor => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    mode: 'rgb',
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { mode: 'rgb', r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

export const OKColorPicker: React.FC<OKColorPickerProps> = ({ value, onChange }) => {
  // Parse initial color
  const initialOkhsl = value ? rgbToOkhsl(hexToRgb(value)) : null;

  const [color, setColor] = useState<Color>({
    hue: initialOkhsl?.h ?? 0,
    saturation: (initialOkhsl?.s ?? 0.5) * 100,
    lightness: (initialOkhsl?.l ?? 0.5) * 100
  });

  // Convert OKHSL to Hex
  const colorToHex = useCallback((h: number, s: number, l: number): string => {
    const okhslColor = {
      mode: 'okhsl' as const,
      h,
      s: s / 100,
      l: l / 100
    };
    
    const rgbColor = okhslToRgb(okhslColor);
    if (!rgbColor) return '#000000';

    return rgbToHex(rgbColor.r, rgbColor.g, rgbColor.b);
  }, []);

  // Generate hue spectrum colors
  const getHueSpectrumBackground = useCallback((): string => {
    const steps = 7;
    const colors = Array.from({ length: steps }, (_, i) => {
      const h = (i * 360) / (steps - 1);
      const okhslColor = {
        mode: 'okhsl' as const,
        h,
        s: color.saturation / 100,
        l: color.lightness / 100
      };
      const rgbColor = okhslToRgb(okhslColor);
      if (!rgbColor) return '#000000';
      return rgbToHex(rgbColor.r, rgbColor.g, rgbColor.b);
    });

    return `linear-gradient(to right, ${colors.join(', ')})`;
  }, [color.saturation, color.lightness]);

  // Update color preview
  const getPreviewColor = useCallback((): string => {
    return colorToHex(color.hue, color.saturation, color.lightness);
  }, [color, colorToHex]);

  // Handle slider changes
  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>, type: 'hue' | 'saturation' | 'lightness') => {
    const value = parseFloat(e.target.value);
    setColor(prevColor => ({
      ...prevColor,
      [type]: value
    }));
  };

  // Update external onChange handler
  useEffect(() => {
    if (onChange) {
      const hex = colorToHex(color.hue, color.saturation, color.lightness);
      onChange(hex);
    }
  }, [color, onChange, colorToHex]);

  return (
    <div>
      {/* Color Preview */}
      <div className="flex mb-4">
        <div 
          className="h-24 w-1/2"
          style={{ backgroundColor: getPreviewColor() }}
        />
        <div 
          className="h-24 w-1/2"
          style={{ backgroundColor: colorToHex(0, 0, color.lightness) }}
        />
      </div>

      {/* Sliders */}
      <div className="space-y-4">
        {/* Hue Slider */}
        <div>
          <label className="block mb-2">Hue: {Math.round(color.hue)}°</label>
          <input
            type="range"
            min="0"
            max="360"
            value={color.hue}
            onChange={(e) => handleSliderChange(e, 'hue')}
            className="w-full"
          />
          <div 
            className="h-8 w-full mt-1 rounded"
            style={{ background: getHueSpectrumBackground() }}
          />
        </div>

        {/* Saturation Slider */}
        <div>
          <label className="block mb-2">Saturation: {Math.round(color.saturation)}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={color.saturation}
            onChange={(e) => handleSliderChange(e, 'saturation')}
            className="w-full"
          />
          <div 
            className="h-8 w-full mt-1 rounded"
            style={{
              background: `linear-gradient(to right, ${
                colorToHex(color.hue, 0, color.lightness)
              }, ${
                colorToHex(color.hue, 100, color.lightness)
              })`
            }}
          />
        </div>

        {/* Lightness Slider */}
        <div>
          <label className="block mb-2">Lightness: {Math.round(color.lightness)}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={color.lightness}
            onChange={(e) => handleSliderChange(e, 'lightness')}
            className="w-full"
          />
          <div 
            className="h-8 w-full mt-1 rounded"
            style={{
              background: `linear-gradient(to right, ${
                colorToHex(color.hue, color.saturation, 0)
              }, ${
                colorToHex(color.hue, color.saturation, 50)
              }, ${
                colorToHex(color.hue, color.saturation, 100)
              })`
            }}
          />
        </div>
      </div>
    </div>
  );
}