import { useState, useEffect, ChangeEvent, useCallback, useMemo } from "react";
import { converter, Color as CuloriColor } from "culori";

interface Color {
  hue: number;
  saturation: number;
  lightness: number;
}

// First, define the default color type
interface HSLColor {
  hue: number;
  saturation: number;
  lightness: number;
}

// Define default values
const DEFAULT_COLOR: HSLColor = {
  hue: 0,          // Red
  saturation: 100, // Full saturation
  lightness: 50    // Medium lightness
};

// Update the props interface to include defaultColor
interface OKColorPickerProps {
  value?: string;
  onChange?: (color: string) => void;
  defaultColor?: HSLColor; // Add this line
}

const rgbToOkhsl = converter("okhsl");
const okhslToRgb = converter("rgb");

// Utility functions defined before use
const hexToRgb = (hex: string): CuloriColor => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        mode: "rgb",
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { mode: "rgb", r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
};


export const OKColorPicker: React.FC<OKColorPickerProps> = ({
  value,
  onChange,
  defaultColor = DEFAULT_COLOR // Use the default value

}) => {
  const initialOkhsl = useMemo(() => 
    value ? rgbToOkhsl(hexToRgb(value)) : {
      h: defaultColor.hue,
      s: defaultColor.saturation / 100,
      l: defaultColor.lightness / 100,
    }
  , [value, defaultColor]);

  const [color, setColor] = useState<Color>(() => ({
    hue: initialOkhsl.h ?? defaultColor.hue,
    saturation: (initialOkhsl.s ?? defaultColor.saturation / 100) * 100,
    lightness: (initialOkhsl.l ?? defaultColor.lightness / 100) * 100,
  }));

  // Convert OKHSL to Hex - memoize this function
  const colorToHex = useCallback((h: number, s: number, l: number): string => {
    const okhslColor = {
      mode: "okhsl" as const,
      h,
      s: s / 100,
      l: l / 100,
    };

    const rgbColor = okhslToRgb(okhslColor);
    if (!rgbColor) return "#000000";

    return rgbToHex(rgbColor.r, rgbColor.g, rgbColor.b);
  }, []);

  // Handle slider changes
  const handleSliderChange = useCallback((
    e: ChangeEvent<HTMLInputElement>,
    type: "hue" | "saturation" | "lightness"
  ) => {
    const value = parseFloat(e.target.value);
    setColor(prevColor => ({
      ...prevColor,
      [type]: value,
    }));
  }, []);

  // Update external onChange handler with proper debouncing
  useEffect(() => {
    if (!onChange) return;
    
    const hex = colorToHex(color.hue, color.saturation, color.lightness);
    const timeoutId = setTimeout(() => {
      onChange(hex);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [color, onChange, colorToHex]);

  // Update color when external value changes
  useEffect(() => {
    if (!value) return;
    
    const okhsl = rgbToOkhsl(hexToRgb(value));
    if (!okhsl) return;

    setColor({
      hue: okhsl.h ?? 0,
      saturation: (okhsl.s ?? 0.5) * 100,
      lightness: (okhsl.l ?? 0.5) * 100,
    });
  }, [value]);

    // Generate hue spectrum colors
    const getHueSpectrumBackground = useCallback((): string => {
      const steps = 7;
      const colors = Array.from({ length: steps }, (_, i) => {
        const h = (i * 360) / (steps - 1);
        const okhslColor = {
          mode: "okhsl" as const,
          h,
          s: color.saturation / 100,
          l: color.lightness / 100,
        };
        const rgbColor = okhslToRgb(okhslColor);
        if (!rgbColor) return "#000000";
        return rgbToHex(rgbColor.r, rgbColor.g, rgbColor.b);
      });
  
      return `linear-gradient(to right, ${colors.join(", ")})`;
    }, [color.saturation, color.lightness]);
  

    

  return (
    <div className="p-4 w-[300px] bg-neutral-900 rounded-lg">
      {/* Color Preview */}
      <div
        className="w-full h-12 rounded mb-6"
        style={{
          backgroundColor: colorToHex(
            color.hue,
            color.saturation,
            color.lightness
          ),
        }}
      />

      {/* Sliders Container */}
      <div className="space-y-6">
        {/* Hue Slider */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm text-white">Hue</span>
            <span className="text-sm text-white">{Math.round(color.hue)}°</span>
          </div>
          <div className="relative">
            <div
              className="h-4 w-full rounded"
              style={{ background: getHueSpectrumBackground() }}
            />
            <input
              type="range"
              min="0"
              max="360"
              value={color.hue}
              onChange={(e) => handleSliderChange(e, "hue")}
              className="absolute top-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-6 bg-white rounded border-2 border-neutral-900"
              style={{
                left: `${(color.hue / 360) * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>
        </div>

        {/* Saturation Slider */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm text-white">Saturation</span>
            <span className="text-sm text-white">
              {Math.round(color.saturation)}%
            </span>
          </div>
          <div className="relative">
            <div
              className="h-4 w-full rounded"
              style={{
                background: `linear-gradient(to right, ${colorToHex(
                  color.hue,
                  0,
                  color.lightness
                )}, ${colorToHex(color.hue, 100, color.lightness)})`,
              }}
            />
            <input
              type="range"
              min="0"
              max="100"
              value={color.saturation}
              onChange={(e) => handleSliderChange(e, "saturation")}
              className="absolute top-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-6 bg-white rounded border-2 border-neutral-900"
              style={{
                left: `${color.saturation}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>
        </div>

  {/* Lightness Slider */}
  <div>
    <div className="flex justify-between mb-1">
      <span className="text-sm text-white">Lightness</span>
      <span className="text-sm text-white">{Math.round(color.lightness)}%</span>
    </div>
    <div className="relative">
      <div
        className="h-4 w-full rounded"
        style={{
          background: `linear-gradient(to right, #000000, #ffffff)`
        }}
      />
      <input
        type="range"
        min="0"
        max="100"
        value={color.lightness}
        onChange={(e) => handleSliderChange(e, 'lightness')}
        className="absolute top-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div 
        className="absolute top-1/2 -translate-y-1/2 w-3 h-6 bg-white rounded border-2 border-neutral-900"
        style={{ left: `${color.lightness}%`, transform: 'translate(-50%, -50%)' }}
      />
    </div>
  </div>
      </div>
    </div>
  );
};
