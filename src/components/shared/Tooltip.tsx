import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useStore } from "../../store";
export const Tooltip = ({
  children,
  content,
  side = "right",
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) => {
  const showTooltips = useStore((state) => state.showTooltips);

  if (!showTooltips) return children;

  return (
    <TooltipPrimitive.Provider delayDuration={0}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Content
          side={side}
          className="bg-gray-900 text-white p-3 rounded-lg max-w-xs text-sm shadow-lg"
          sideOffset={5}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-gray-900" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};
