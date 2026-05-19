import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ComponentPropsWithoutRef, HTMLAttributes, Ref } from "react";

import { cn } from "../utils/cn.ts";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

type DialogOverlayProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & {
  ref?: Ref<HTMLDivElement>;
};

export const DialogOverlay = ({
  className,
  ref,
  ...rest
}: DialogOverlayProps): React.ReactElement => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-slot="dialog-overlay"
    className={cn(
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 fixed inset-0 z-50 bg-black/50",
      className
    )}
    {...rest}
  />
);

interface DialogContentProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  ref?: Ref<HTMLDivElement>;
  showCloseButton?: boolean;
}

export const DialogContent = ({
  className,
  children,
  showCloseButton = true,
  ref,
  ...rest
}: DialogContentProps): React.ReactElement => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      data-slot="dialog-content"
      className={cn(
        "border-border bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
        className
      )}
      {...rest}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close
          data-slot="dialog-close"
          className="ring-offset-background focus-visible:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none [&_svg]:size-4"
          aria-label="Close"
        >
          <span aria-hidden="true">×</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
);

export const DialogHeader = ({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>): React.ReactElement => (
  <div
    data-slot="dialog-header"
    className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
    {...rest}
  />
);

export const DialogFooter = ({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>): React.ReactElement => (
  <div
    data-slot="dialog-footer"
    className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
    {...rest}
  />
);

type DialogTitleProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Title> & {
  ref?: Ref<HTMLHeadingElement>;
};

export const DialogTitle = ({ className, ref, ...rest }: DialogTitleProps): React.ReactElement => (
  <DialogPrimitive.Title
    ref={ref}
    data-slot="dialog-title"
    className={cn("text-lg leading-none font-semibold", className)}
    {...rest}
  />
);

type DialogDescriptionProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Description> & {
  ref?: Ref<HTMLParagraphElement>;
};

export const DialogDescription = ({
  className,
  ref,
  ...rest
}: DialogDescriptionProps): React.ReactElement => (
  <DialogPrimitive.Description
    ref={ref}
    data-slot="dialog-description"
    className={cn("text-muted-foreground text-sm", className)}
    {...rest}
  />
);
