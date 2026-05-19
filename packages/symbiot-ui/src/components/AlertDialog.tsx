import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import type { ComponentPropsWithoutRef, HTMLAttributes, Ref } from "react";

import { cn } from "../utils/cn.ts";

import { buttonVariants } from "./Button.tsx";

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogPortal = AlertDialogPrimitive.Portal;

type AlertDialogOverlayProps = ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay> & {
  ref?: Ref<HTMLDivElement>;
};

export const AlertDialogOverlay = ({
  className,
  ref,
  ...rest
}: AlertDialogOverlayProps): React.ReactElement => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 fixed inset-0 z-50 bg-black/50",
      className
    )}
    {...rest}
  />
);

interface AlertDialogContentProps extends ComponentPropsWithoutRef<
  typeof AlertDialogPrimitive.Content
> {
  ref?: Ref<HTMLDivElement>;
}

export const AlertDialogContent = ({
  className,
  ref,
  ...rest
}: AlertDialogContentProps): React.ReactElement => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "border-border bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border p-6 shadow-lg duration-200",
        className
      )}
      {...rest}
    />
  </AlertDialogPortal>
);

export const AlertDialogHeader = ({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>): React.ReactElement => (
  <div className={cn("flex flex-col gap-2 text-center sm:text-left", className)} {...rest} />
);

export const AlertDialogFooter = ({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>): React.ReactElement => (
  <div
    className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
    {...rest}
  />
);

type AlertDialogTitleProps = ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title> & {
  ref?: Ref<HTMLHeadingElement>;
};

export const AlertDialogTitle = ({
  className,
  ref,
  ...rest
}: AlertDialogTitleProps): React.ReactElement => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...rest}
  />
);

type AlertDialogDescriptionProps = ComponentPropsWithoutRef<
  typeof AlertDialogPrimitive.Description
> & { ref?: Ref<HTMLParagraphElement> };

export const AlertDialogDescription = ({
  className,
  ref,
  ...rest
}: AlertDialogDescriptionProps): React.ReactElement => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-muted-foreground text-sm", className)}
    {...rest}
  />
);

type AlertDialogActionProps = ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> & {
  ref?: Ref<HTMLButtonElement>;
};

export const AlertDialogAction = ({
  className,
  ref,
  ...rest
}: AlertDialogActionProps): React.ReactElement => (
  <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants(), className)} {...rest} />
);

type AlertDialogCancelProps = ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel> & {
  ref?: Ref<HTMLButtonElement>;
};

export const AlertDialogCancel = ({
  className,
  ref,
  ...rest
}: AlertDialogCancelProps): React.ReactElement => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)}
    {...rest}
  />
);
