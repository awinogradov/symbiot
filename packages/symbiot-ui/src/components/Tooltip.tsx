import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentPropsWithoutRef, Ref } from "react";

import { cn } from "../utils/cn.ts";

type TooltipProviderProps = ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>;

export const TooltipProvider = ({
  delayDuration = 0,
  ...rest
}: TooltipProviderProps): React.ReactElement => (
  <TooltipPrimitive.Provider delayDuration={delayDuration} {...rest} />
);

type TooltipRootProps = ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>;

export const Tooltip = (props: TooltipRootProps): React.ReactElement => (
  <TooltipProvider>
    <TooltipPrimitive.Root {...props} />
  </TooltipProvider>
);

export const TooltipTrigger = TooltipPrimitive.Trigger;

type TooltipContentProps = ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
  ref?: Ref<HTMLDivElement>;
};

export const TooltipContent = ({
  className,
  sideOffset = 4,
  children,
  ref,
  ...rest
}: TooltipContentProps): React.ReactElement => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      data-slot="tooltip-content"
      sideOffset={sideOffset}
      className={cn(
        "bg-primary text-primary-foreground data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-[state=closed]:zoom-out-95 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance shadow-md",
        className
      )}
      {...rest}
    >
      {children}
      <TooltipPrimitive.Arrow className="bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
);
