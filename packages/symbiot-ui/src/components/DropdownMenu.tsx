import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ComponentPropsWithoutRef, HTMLAttributes, Ref } from "react";

import { cn } from "../utils/cn.ts";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

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
        "border-border bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 z-50 min-w-32 overflow-hidden rounded-md border p-1 shadow-md",
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
  inset?: boolean;
}

export const DropdownMenuItem = ({
  className,
  inset,
  ref,
  ...rest
}: DropdownMenuItemProps): React.ReactElement => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
      inset === true && "pl-8",
      className
    )}
    {...rest}
  />
);

interface DropdownMenuLabelProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Label
> {
  ref?: Ref<HTMLDivElement>;
  inset?: boolean;
}

export const DropdownMenuLabel = ({
  className,
  inset,
  ref,
  ...rest
}: DropdownMenuLabelProps): React.ReactElement => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset === true && "pl-8", className)}
    {...rest}
  />
);

type DropdownMenuSeparatorProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Separator
> & {
  ref?: Ref<HTMLDivElement>;
};

export const DropdownMenuSeparator = ({
  className,
  ref,
  ...rest
}: DropdownMenuSeparatorProps): React.ReactElement => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("bg-border -mx-1 my-1 h-px", className)}
    {...rest}
  />
);

export const DropdownMenuShortcut = ({
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement>): React.ReactElement => (
  <span
    className={cn("text-muted-foreground ml-auto text-xs tracking-widest", className)}
    {...rest}
  />
);

interface DropdownMenuSubTriggerProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.SubTrigger
> {
  ref?: Ref<HTMLDivElement>;
  inset?: boolean;
}

export const DropdownMenuSubTrigger = ({
  className,
  inset,
  ref,
  children,
  ...rest
}: DropdownMenuSubTriggerProps): React.ReactElement => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none",
      inset === true && "pl-8",
      className
    )}
    {...rest}
  >
    {children}
  </DropdownMenuPrimitive.SubTrigger>
);

type DropdownMenuSubContentProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.SubContent
> & { ref?: Ref<HTMLDivElement> };

export const DropdownMenuSubContent = ({
  className,
  ref,
  ...rest
}: DropdownMenuSubContentProps): React.ReactElement => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "border-border bg-popover text-popover-foreground z-50 min-w-32 overflow-hidden rounded-md border p-1 shadow-md",
      className
    )}
    {...rest}
  />
);

interface DropdownMenuCheckboxItemProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.CheckboxItem
> {
  ref?: Ref<HTMLDivElement>;
}

export const DropdownMenuCheckboxItem = ({
  className,
  children,
  checked,
  ref,
  ...rest
}: DropdownMenuCheckboxItemProps): React.ReactElement => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...rest}
  >
    <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>✓</DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
);

interface DropdownMenuRadioItemProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.RadioItem
> {
  ref?: Ref<HTMLDivElement>;
}

export const DropdownMenuRadioItem = ({
  className,
  children,
  ref,
  ...rest
}: DropdownMenuRadioItemProps): React.ReactElement => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
      className
    )}
    {...rest}
  >
    <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>•</DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
);
