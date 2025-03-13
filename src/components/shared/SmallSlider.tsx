import { useState, useRef, useCallback, useEffect } from "react";

interface SmallSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
}

export function SmallSlider({ value, onChange, min = 0, max = 1, step = 0.05, label }: SmallSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const updateValue = useCallback((clientX: number) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newValue = min + (max - min) * percentage;
    onChange(Math.round(newValue / step) * step);
  }, [min, max, step, onChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setShowLabel(true);
    updateValue(e.clientX);
  };

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setShowLabel(false);
  }, []);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      updateValue(e.clientX);
    }
  }, [isDragging, updateValue]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleGlobalMouseMove, handleMouseUp]);

  const handlePosition = ((value - min) / (max - min)) * 100;

  return (
    <div 
      className="relative w-full px-1.5 py-1" 
      ref={sliderRef}
      onMouseEnter={() => setShowLabel(true)}
      onMouseLeave={() => !isDragging && setShowLabel(false)}
    >
      <div
        className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-700 rounded cursor-pointer"
        onMouseDown={handleMouseDown}
      >
        <div
          className="h-full bg-blue-600 dark:bg-blue-500 rounded"
          style={{ width: `${handlePosition}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-400 dark:bg-blue-300 border border-blue-500 dark:border-blue-400 rounded-full shadow-sm cursor-pointer"
          style={{ left: `calc(${handlePosition}% - 6px)` }}
          onMouseDown={handleMouseDown}
        />
      </div>
      {showLabel && (
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-neutral-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {label}: {value.toFixed(2)}
        </div>
      )}
    </div>
  );
} 