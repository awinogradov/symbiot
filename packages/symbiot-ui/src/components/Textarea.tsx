import type { Ref, TextareaHTMLAttributes } from "react";

import { cn } from "../cn.ts";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: Ref<HTMLTextAreaElement>;
}

/** shadcn-style textarea, vendored. */
export const Textarea = ({ className, ref, ...rest }: TextareaProps): React.ReactElement => (
  <textarea
    ref={ref}
    className={cn(
      "border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none",
      className
    )}
    {...rest}
  />
);
