import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";
import { useThemeClass } from "../../styles/useThemeClass";

interface DropdownButtonProps {
  label: string;
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

export const DropdownButton: React.FC<DropdownButtonProps> = ({
  label,
  isOpen,
  onClick,
  className,
}) => {
  const styles = {
    sidePanel: {
      container: useThemeClass(["shape", "sidePanel", "container"]),
      label: useThemeClass(["shape", "sidePanel", "label"])
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        `${styles.sidePanel.container} w-[140px] h-[34px] px-2 flex items-center justify-between`,
        className
      )}
    >
      <span className={styles.sidePanel.label}>{label}</span>
      <ChevronDown
        className={cn(
          "w-3 h-3 transition-transform",
          isOpen && "transform rotate-180"
        )}
      />
    </button>
  );
}; 