import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import type { ComponentPropsWithoutRef, Ref } from "react";

import { cn } from "../utils/cn.ts";

// ToggleGroupPrimitive.Root's props are a discriminated union (single | multiple),
// which TS interfaces cannot extend — keep this as a type alias.
type ToggleGroupProps = ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> & {
  ref?: Ref<HTMLDivElement>;
};

export const ToggleGroup = ({ className, ref, ...rest }: ToggleGroupProps): React.ReactElement => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn("border-border inline-flex items-center rounded-md border", className)}
    {...rest}
  />
);

interface ToggleGroupItemProps extends ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> {
  ref?: Ref<HTMLButtonElement>;
}

export const ToggleGroupItem = ({
  className,
  ref,
  ...rest
}: ToggleGroupItemProps): React.ReactElement => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(
      "hover:bg-accent hover:text-accent-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground inline-flex h-8 items-center justify-center px-3 text-sm font-medium transition-colors first:rounded-l-md last:rounded-r-md focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...rest}
  />
);
