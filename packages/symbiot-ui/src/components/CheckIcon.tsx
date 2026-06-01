/**
 * @module CheckIcon
 * Animated check mark that draws itself on hover. Adapted from
 * `pqoqubbw/icons` (the source repo behind lucide-animated.com), with the
 * registry's `forwardRef` + `useImperativeHandle` plumbing dropped because
 * the codebase only needs hover-triggered playback.
 *
 * Inherits stroke color from `currentColor` — set color via a `text-*`
 * Tailwind class on the parent. Pixel size comes from the parent's
 * `[&_svg]:size-*` rule (e.g., inside `<Button>` it resolves to `size-4`);
 * the `size` prop is the SVG's intrinsic dimension and is overridden by
 * that descendant selector in practice.
 *
 * @see https://github.com/pqoqubbw/icons/blob/main/icons/check.tsx
 * @example
 * <Button>
 *   <CheckIcon />
 *   Approve
 * </Button>
 */

import type { HTMLAttributes } from "react";

import { cn } from "../utils/cn.ts";

/** Props for the animated `CheckIcon`. */
export interface CheckIconProps extends HTMLAttributes<HTMLDivElement> {
  /** SVG intrinsic dimension in pixels. Default 28; the parent's `[&_svg]:size-*` rule typically overrides this. */
  size?: number;
}

export const CheckIcon = ({
  className,
  size = 28,
  ...rest
}: CheckIconProps): React.ReactElement => {
  return (
    <div className={cn("symbiot-icon", className)} {...rest}>
      <svg
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/*
         * Draw replays on hover via CSS (`symbiot-check-path`, keyed on an
         * ancestor `[data-slot="button"]:hover` or self-hover). `pathLength={1}`
         * normalizes the stroke dash units so the dashoffset transition is
         * resolution-independent. Replaces the former Framer Motion path.
         */}
        <path className="symbiot-check-path" d="M4 12 9 17L20 6" pathLength={1} />
      </svg>
    </div>
  );
};
