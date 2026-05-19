import * as SheetPrimitive from "@radix-ui/react-dialog";
import type { ComponentPropsWithoutRef, HTMLAttributes, Ref } from "react";

import { cn } from "../utils/cn.ts";

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;
export const SheetPortal = SheetPrimitive.Portal;

type SheetOverlayProps = ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay> & {
  ref?: Ref<HTMLDivElement>;
};

export const SheetOverlay = ({
  className,
  ref,
  ...rest
}: SheetOverlayProps): React.ReactElement => (
  <SheetPrimitive.Overlay
    ref={ref}
    data-slot="sheet-overlay"
    className={cn(
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 fixed inset-0 z-50 bg-black/50",
      className
    )}
    {...rest}
  />
);

const sheetSideClass = (side: "top" | "right" | "bottom" | "left"): string => {
  switch (side) {
    case "right":
      return "inset-y-0 right-0 h-full w-3/4 border-l border-border data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm";
    case "left":
      return "inset-y-0 left-0 h-full w-3/4 border-r border-border data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm";
    case "top":
      return "inset-x-0 top-0 h-auto border-b border-border data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top";
    case "bottom":
      return "inset-x-0 bottom-0 h-auto border-t border-border data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom";
  }
};

interface SheetContentProps extends ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
  ref?: Ref<HTMLDivElement>;
  side?: "top" | "right" | "bottom" | "left";
}

export const SheetContent = ({
  side = "right",
  className,
  children,
  ref,
  ...rest
}: SheetContentProps): React.ReactElement => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      data-slot="sheet-content"
      className={cn(
        "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
        sheetSideClass(side),
        className
      )}
      {...rest}
    >
      {children}
      <SheetPrimitive.Close
        data-slot="sheet-close"
        className="ring-offset-background focus-visible:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:outline-none [&_svg]:size-4"
        aria-label="Close"
      >
        <span aria-hidden="true">×</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
);

export const SheetHeader = ({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>): React.ReactElement => (
  <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5 p-4", className)} {...rest} />
);

export const SheetFooter = ({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>): React.ReactElement => (
  <div
    data-slot="sheet-footer"
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...rest}
  />
);

type SheetTitleProps = ComponentPropsWithoutRef<typeof SheetPrimitive.Title> & {
  ref?: Ref<HTMLHeadingElement>;
};

export const SheetTitle = ({ className, ref, ...rest }: SheetTitleProps): React.ReactElement => (
  <SheetPrimitive.Title
    ref={ref}
    data-slot="sheet-title"
    className={cn("text-foreground font-semibold", className)}
    {...rest}
  />
);

type SheetDescriptionProps = ComponentPropsWithoutRef<typeof SheetPrimitive.Description> & {
  ref?: Ref<HTMLParagraphElement>;
};

export const SheetDescription = ({
  className,
  ref,
  ...rest
}: SheetDescriptionProps): React.ReactElement => (
  <SheetPrimitive.Description
    ref={ref}
    data-slot="sheet-description"
    className={cn("text-muted-foreground text-sm", className)}
    {...rest}
  />
);
