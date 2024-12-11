import { forwardRef } from "react";
import { cn } from "../../utils/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          "disabled:pointer-events-none disabled:opacity-50",
          {
            default: "bg-blue-600 text-white hover:bg-blue-700",
            outline:
              "border border-gray-200 bg-white hover:bg-gray-50 text-gray-700",
            ghost: "hover:bg-gray-100 text-gray-700",
            link: "text-blue-600 underline-offset-4 hover:underline",
          }[variant],
          {
            default: "h-9 px-4 py-2",
            sm: "h-8 px-3 text-sm",
            lg: "h-10 px-8",
          }[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
