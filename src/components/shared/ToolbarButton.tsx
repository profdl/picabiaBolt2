import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { useThemeClass } from "../../styles/useThemeClass";

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
    const styles = {
      base: useThemeClass(['button', 'toolbar', 'base']),
      variant: {
        default: useThemeClass(['button', 'toolbar', 'default']),
        primary: useThemeClass(['button', 'variant', 'primary']),
        ghost: useThemeClass(['button', 'variant', 'ghost'])
      },
      active: useThemeClass(['button', 'toolbar', 'active']),
      loading: 'opacity-50 cursor-not-allowed',
      label: useThemeClass(['button', 'toolbar', 'label'])
    };

    return (
      <button
        ref={ref}
        className={cn(
          styles.base,
          styles.variant[variant],
          active && styles.active,
          loading && styles.loading,
          className
        )}
        {...props}
      >
        {icon}
        {label && (
          <span className={styles.label}>{label}</span>
        )}
      </button>
    );
  }
);

ToolbarButton.displayName = "ToolbarButton";