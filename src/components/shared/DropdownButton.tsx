import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";

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
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md",
        "bg-white dark:bg-neutral-800",
        "border border-neutral-200 dark:border-neutral-700",
        "hover:bg-neutral-50 dark:hover:bg-neutral-700",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900",
        isOpen && "bg-neutral-50 dark:bg-neutral-700",
        className
      )}
    >
      <span>{label}</span>
      <ChevronDown
        className={cn(
          "w-4 h-4 transition-transform duration-200",
          isOpen && "transform rotate-180"
        )}
      />
    </button>
  );
}; 