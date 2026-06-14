import type { HTMLAttributes, Ref } from "react";

import { cn } from "../utils/cn.ts";

interface BaseProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

export const Card = ({ className, ref, ...rest }: BaseProps): React.ReactElement => (
  <div
    ref={ref}
    data-slot="card"
    className={cn(
      "border-border bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
      className
    )}
    {...rest}
  />
);

export const CardHeader = ({ className, ref, ...rest }: BaseProps): React.ReactElement => (
  <div
    ref={ref}
    data-slot="card-header"
    className={cn("grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6", className)}
    {...rest}
  />
);

export const CardTitle = ({ className, ref, ...rest }: BaseProps): React.ReactElement => (
  <div
    ref={ref}
    data-slot="card-title"
    className={cn("leading-none font-semibold", className)}
    {...rest}
  />
);

export const CardDescription = ({ className, ref, ...rest }: BaseProps): React.ReactElement => (
  <div
    ref={ref}
    data-slot="card-description"
    className={cn("text-muted-foreground text-sm", className)}
    {...rest}
  />
);

export const CardContent = ({ className, ref, ...rest }: BaseProps): React.ReactElement => (
  <div ref={ref} data-slot="card-content" className={cn("px-6", className)} {...rest} />
);

export const CardFooter = ({ className, ref, ...rest }: BaseProps): React.ReactElement => (
  <div
    ref={ref}
    data-slot="card-footer"
    className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
    {...rest}
  />
);
