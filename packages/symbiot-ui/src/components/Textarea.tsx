import type { Ref, TextareaHTMLAttributes } from "react";

import { cn } from "../utils/cn.ts";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: Ref<HTMLTextAreaElement>;
}

export const Textarea = ({ className, ref, ...rest }: TextareaProps): React.ReactElement => (
  <textarea
    data-slot="textarea"
    ref={ref}
    className={cn(
      "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...rest}
  />
);
