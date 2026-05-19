import type { ButtonHTMLAttributes } from "react";

import { cn } from "../cn.ts";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
}

const variantClass = (variant: ButtonProps["variant"]): string => {
  switch (variant) {
    case "outline":
      return "border border-input bg-background hover:bg-accent hover:text-accent-foreground";
    case "ghost":
      return "hover:bg-accent hover:text-accent-foreground";
    default:
      return "bg-primary text-primary-foreground hover:bg-primary/90";
  }
};

/** shadcn-style button vendored locally; variants: default / outline / ghost. */
export const Button = ({
  className,
  variant = "default",
  type = "button",
  ...rest
}: ButtonProps): React.ReactElement => (
  <button
    type={type}
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
      variantClass(variant),
      className
    )}
    {...rest}
  />
);
