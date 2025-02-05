import { forwardRef } from "react";
import { cn } from "../../utils/cn";

interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  label?: string;
  active?: boolean;
  loading?: boolean;
  variant?: "default" | "primary" | "ghost";
}

export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ 
    icon, 
    label, 
    active = false, 
    loading = false,
    variant = "default",
    className,
    ...props 
  }, ref) => {
    const variantClasses = {
      default: "hover:bg-gray-100",
      primary: "bg-blue-600 hover:bg-blue-700 text-white",
      ghost: "bg-gray-100 hover:bg-gray-150"
    };

    return (
      <button
        ref={ref}
        className={cn(
          "p-2 rounded-lg inline-flex items-center justify-center gap-1",
          variant === "primary" ? "text-white" : "text-gray-700",
          variantClasses[variant],
          active && "bg-gray-300",
          loading && "opacity-50 cursor-not-allowed",
          className
        )}
        {...props}
      >
        {icon}
        {label && (
          <span className="text-sm font-medium leading-none">{label}</span>
        )}
      </button>
    );
  }
);

ToolbarButton.displayName = "ToolbarButton";