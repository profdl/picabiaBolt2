import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { useThemeClass } from "../../styles/useThemeClass";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const styles = {
      base: useThemeClass(['button', 'base']),
      variant: {
        default: useThemeClass(['button', 'variant', 'default']),
        outline: useThemeClass(['button', 'variant', 'outline']),
        ghost: useThemeClass(['button', 'variant', 'ghost']),
        link: useThemeClass(['button', 'variant', 'link'])
      },
      size: {
        default: useThemeClass(['button', 'size', 'default']),
        sm: useThemeClass(['button', 'size', 'sm']),
        lg: useThemeClass(['button', 'size', 'lg'])
      }
    };

    return (
      <button
        className={cn(
          styles.base,
          styles.variant[variant],
          styles.size[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";