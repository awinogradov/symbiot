import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentPropsWithoutRef, Ref } from "react";

import { cn } from "../utils/cn.ts";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

type TooltipContentProps = ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
  ref?: Ref<HTMLDivElement>;
};

export const TooltipContent = ({
  className,
  sideOffset = 4,
  ref,
  ...rest
}: TooltipContentProps): React.ReactElement => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "border-border bg-popover text-popover-foreground z-50 rounded-md border px-2 py-1 text-xs shadow-sm",
        className
      )}
      {...rest}
    />
  </TooltipPrimitive.Portal>
);
