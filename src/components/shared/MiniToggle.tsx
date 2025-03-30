import { useThemeClass } from "../../styles/useThemeClass";
import { forwardRef } from "react";

interface MiniToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
  label: string;
  disabled?: boolean;
}

export const MiniToggle = forwardRef<HTMLLabelElement, MiniToggleProps>(
  function MiniToggle({ checked, onChange, id, label, disabled = false }, ref) {
    const styles = {
      label: useThemeClass(["shape", "sidePanel", "label"]),
    };

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        onChange(!checked);
      }
    };

    return (
      <label
        ref={ref}
        htmlFor={id}
        className="relative inline-flex items-center cursor-pointer"
        data-shape-control="true"
        onClick={handleClick}
      >
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={() => {}}
          className="sr-only peer"
          disabled={disabled}
          data-shape-control="true"
        />
        <div
          className={`relative w-5 h-2.5 rounded-full 
            peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-400
            after:content-[''] after:absolute after:top-[1px] after:left-[1px] 
            after:bg-white after:rounded-full after:h-[8px] after:w-[8px] 
            after:transition-all
            ${checked 
              ? 'bg-green-500 dark:bg-green-400 after:translate-x-[11px]' 
              : 'bg-neutral-300 dark:bg-neutral-600 after:translate-x-0'
            }
            ${disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'cursor-pointer'
            }`}
          data-shape-control="true"
        />
        <span className={`ml-1.5 ${styles.label}`}>{label}</span>
      </label>
    );
  }
); 