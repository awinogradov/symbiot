import type { HTMLAttributes } from "react";

import { cn } from "../utils/cn.ts";

export const Skeleton = ({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>): React.ReactElement => (
  <div
    data-slot="skeleton"
    className={cn("bg-accent animate-pulse rounded-md", className)}
    {...rest}
  />
);
