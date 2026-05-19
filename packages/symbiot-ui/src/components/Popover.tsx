import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentPropsWithoutRef, Ref } from "react";

import { cn } from "../utils/cn.ts";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

interface PopoverContentProps extends ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {
  ref?: Ref<HTMLDivElement>;
}

export const PopoverContent = ({
  className,
  align = "start",
  sideOffset = 4,
  ref,
  ...rest
}: PopoverContentProps): React.ReactElement => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "border-border bg-popover text-popover-foreground z-50 w-72 rounded-md border p-3 shadow-md outline-none",
        className
      )}
      {...rest}
    />
  </PopoverPrimitive.Portal>
);
