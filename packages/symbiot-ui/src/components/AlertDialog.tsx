import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import type { ComponentPropsWithoutRef, Ref } from "react";

import { cn } from "../cn.ts";

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogAction = AlertDialogPrimitive.Action;
export const AlertDialogCancel = AlertDialogPrimitive.Cancel;

type AlertDialogContentProps = ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> & {
  ref?: Ref<HTMLDivElement>;
};

export const AlertDialogContent = ({
  className,
  ref,
  ...rest
}: AlertDialogContentProps): React.ReactElement => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out fixed inset-0 z-50 bg-black/50" />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "border-border bg-background fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border p-6 shadow-lg",
        className
      )}
      {...rest}
    />
  </AlertDialogPrimitive.Portal>
);

type AlertDialogTitleProps = ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>;

export const AlertDialogTitle = ({
  className,
  ...rest
}: AlertDialogTitleProps): React.ReactElement => (
  <AlertDialogPrimitive.Title className={cn("text-lg font-semibold", className)} {...rest} />
);

type AlertDialogDescriptionProps = ComponentPropsWithoutRef<
  typeof AlertDialogPrimitive.Description
>;

export const AlertDialogDescription = ({
  className,
  ...rest
}: AlertDialogDescriptionProps): React.ReactElement => (
  <AlertDialogPrimitive.Description
    className={cn("text-muted-foreground mt-2 text-sm", className)}
    {...rest}
  />
);
