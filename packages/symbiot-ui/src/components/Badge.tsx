import type { HTMLAttributes } from "react";

import { cn } from "../utils/cn.ts";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline";
}

const variantClass = (variant: BadgeProps["variant"]): string => {
  switch (variant) {
    case "secondary":
      return "bg-secondary text-secondary-foreground";
    case "outline":
      return "border-border text-foreground border bg-transparent";
    default:
      return "bg-primary text-primary-foreground";
  }
};

/** Small count / status pill. Tailwind-only; no Radix dep. */
export const Badge = ({
  className,
  variant = "default",
  ...rest
}: BadgeProps): React.ReactElement => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
      variantClass(variant),
      className
    )}
    {...rest}
  />
);
