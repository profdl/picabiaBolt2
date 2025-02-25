import React, { useRef, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  formatValue?: (value: number) => string;
  
}

export const NumberInput: React.FC<Props> = ({
  value = 0,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  formatValue = (v) => v.toString()
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const startXRef = useRef<number>(0);
  const startValueRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ensure value is a number and within bounds
  const sanitizedValue = Math.max(min, Math.min(max, Number(value) || 0));
  
  // Safe display value calculation
  const getDisplayValue = () => {
    if (typeof sanitizedValue !== 'number') return '0';
    const formattedValue = formatValue(sanitizedValue);
    return formattedValue || sanitizedValue.toString();
  };

  const [inputValue, setInputValue] = useState(getDisplayValue());
  const isPercentageFormat = getDisplayValue().includes('%');

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditing) return;
    setIsDragging(true);
    startXRef.current = e.clientX;
    startValueRef.current = value;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || isEditing) return;

    const dx = e.clientX - startXRef.current;
    const range = max - min;
    const sensitivity = range / 200;
    const newValue = startValueRef.current + dx * sensitivity;
    
    const clampedValue = Math.max(min, Math.min(max, newValue));
    const steppedValue = Math.round(clampedValue / step) * step;
    
    onChange(steppedValue);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleClick = () => {
    if (!isEditing) {
      setIsEditing(true);
      setInputValue(getDisplayValue());
      setTimeout(() => inputRef.current?.select(), 0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    // Add immediate value update
    const newValue = parseAndValidateInput(e.target.value);
    if (newValue !== null) {
      onChange(newValue);
    }
  };

  const parseAndValidateInput = (input: string): number | null => {
    const parsed = parseFloat(input);
    if (isNaN(parsed)) return null;

    let finalValue = parsed;
    if (isPercentageFormat) {
      finalValue = parsed / 100;
    }

    const clampedValue = Math.max(min, Math.min(max, finalValue));
    return Math.round(clampedValue / step) * step;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setIsEditing(false);
      if (e.key === 'Escape') {
        setInputValue(getDisplayValue());
      }
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const increment = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  const decrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  return (
    <div className="inline-flex items-stretch">
      <div 
        className={`
          relative flex items-center flex-1 w-[44px] h-5
          bg-neutral-50 dark:bg-[#2c2c2c] 
          border border-neutral-200 dark:border-[#404040] 
          rounded-l px-2 
          select-none font-mono text-xs
          text-neutral-700 dark:text-[#999999]
          ${isDragging ? 'border-neutral-400 dark:border-[#606060]' : ''}
          ${isEditing ? 'cursor-text' : 'cursor-ew-resize'}
          touch-none
        `}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full h-full bg-transparent outline-none text-neutral-700 dark:text-[#999999] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        ) : (
          <span className="text-neutral-700 dark:text-[#999999]">
            {getDisplayValue()}
          </span>
        )}
      </div>
      <div className="flex flex-col border-l border-neutral-200 dark:border-[#404040]">
        <button
          className="flex items-center justify-center w-4 h-2.5 bg-neutral-50 dark:bg-[#2c2c2c] hover:bg-neutral-100 dark:hover:bg-[#3e3e3e] rounded-tr"
          onClick={increment}
        >
          <ChevronUp className="w-2.5 h-2.5 text-neutral-600 dark:text-[#999999]" />
        </button>
        <button
          className="flex items-center justify-center w-4 h-2.5 bg-neutral-50 dark:bg-[#2c2c2c] hover:bg-neutral-100 dark:hover:bg-[#3e3e3e] rounded-br border-t border-neutral-200 dark:border-[#404040]"
          onClick={decrement}
        >
          <ChevronDown className="w-2.5 h-2.5 text-neutral-600 dark:text-[#999999]" />
        </button>
      </div>
    </div>
  );
};