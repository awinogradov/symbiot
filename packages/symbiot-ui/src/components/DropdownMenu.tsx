import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ComponentPropsWithoutRef, Ref } from "react";

import { cn } from "../utils/cn.ts";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

interface DropdownMenuContentProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Content
> {
  ref?: Ref<HTMLDivElement>;
}

export const DropdownMenuContent = ({
  className,
  align = "start",
  sideOffset = 4,
  ref,
  ...rest
}: DropdownMenuContentProps): React.ReactElement => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "border-border bg-popover text-popover-foreground z-50 min-w-40 rounded-md border p-1 shadow-md outline-none",
        className
      )}
      {...rest}
    />
  </DropdownMenuPrimitive.Portal>
);

interface DropdownMenuItemProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Item
> {
  ref?: Ref<HTMLDivElement>;
}

export const DropdownMenuItem = ({
  className,
  ref,
  ...rest
}: DropdownMenuItemProps): React.ReactElement => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "focus:bg-accent focus:text-accent-foreground relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...rest}
  />
);
