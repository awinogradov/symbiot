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

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes, MouseEvent } from "react";
import { useCallback } from "react";

import { cn } from "../utils/cn.ts";

/** Props for the animated `CheckIcon`. */
export interface CheckIconProps extends HTMLAttributes<HTMLDivElement> {
  /** SVG intrinsic dimension in pixels. Default 28; the parent's `[&_svg]:size-*` rule typically overrides this. */
  size?: number;
}

const pathVariants: Variants = {
  normal: {
    opacity: 1,
    pathLength: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      opacity: { duration: 0.1 },
    },
  },
  animate: {
    opacity: [0, 1],
    pathLength: [0, 1],
    scale: [0.5, 1],
    transition: {
      duration: 0.4,
      opacity: { duration: 0.1 },
    },
  },
};

export const CheckIcon = ({
  onMouseEnter,
  onMouseLeave,
  className,
  size = 28,
  ...rest
}: CheckIconProps): React.ReactElement => {
  const controls = useAnimation();

  const handleMouseEnter = useCallback(
    (event: MouseEvent<HTMLDivElement>): void => {
      controls.start("animate");
      onMouseEnter?.(event);
    },
    [controls, onMouseEnter]
  );

  const handleMouseLeave = useCallback(
    (event: MouseEvent<HTMLDivElement>): void => {
      controls.start("normal");
      onMouseLeave?.(event);
    },
    [controls, onMouseLeave]
  );

  return (
    <div
      className={cn(className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...rest}
    >
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
        <motion.path
          animate={controls}
          d="M4 12 9 17L20 6"
          initial="normal"
          variants={pathVariants}
        />
      </svg>
    </div>
  );
};
