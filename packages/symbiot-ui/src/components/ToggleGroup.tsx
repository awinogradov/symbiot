import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import { createContext, use, type ComponentPropsWithoutRef, type Ref } from "react";

import { cn } from "../utils/cn.ts";

export const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-4 min-w-9",
        sm: "h-8 px-3 min-w-8",
        lg: "h-10 px-6 min-w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

interface ToggleGroupContextValue {
  variant?: VariantProps<typeof toggleVariants>["variant"];
  size?: VariantProps<typeof toggleVariants>["size"];
}

const ToggleGroupContext = createContext<ToggleGroupContextValue>({});

type ToggleGroupProps = ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants> & { ref?: Ref<HTMLDivElement> };

export const ToggleGroup = ({
  className,
  variant,
  size,
  children,
  ref,
  ...rest
}: ToggleGroupProps): React.ReactElement => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn("inline-flex items-center gap-1", className)}
    {...rest}
  >
    <ToggleGroupContext value={{ variant, size }}>{children}</ToggleGroupContext>
  </ToggleGroupPrimitive.Root>
);

interface ToggleGroupItemProps
  extends
    ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>,
    VariantProps<typeof toggleVariants> {
  ref?: Ref<HTMLButtonElement>;
}

export const ToggleGroupItem = ({
  className,
  variant,
  size,
  ref,
  ...rest
}: ToggleGroupItemProps): React.ReactElement => {
  const ctx = use(ToggleGroupContext);
  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleVariants({
          variant: variant ?? ctx.variant,
          size: size ?? ctx.size,
        }),
        className
      )}
      {...rest}
    />
  );
};
