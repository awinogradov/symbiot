/**
 * @module SendIcon
 * Animated paper-plane icon. On hover the plane lifts up-right and shrinks
 * while a dashed trail draws in behind it. Adapted from `pqoqubbw/icons`
 * (the source repo behind lucide-animated.com), with the registry's
 * `forwardRef` + `useImperativeHandle` plumbing dropped because the
 * codebase only needs hover-triggered playback.
 *
 * Inherits stroke color from `currentColor` — set color via a `text-*`
 * Tailwind class on the parent. Pixel size comes from the parent's
 * `[&_svg]:size-*` rule (e.g., inside `<Button>` it resolves to `size-4`);
 * the `size` prop is the SVG's intrinsic dimension and is overridden by
 * that descendant selector in practice. The inner SVG sets `overflow-visible`
 * so the trail can extend past the icon's box without being clipped.
 *
 * @see https://github.com/pqoqubbw/icons/blob/main/icons/send.tsx
 * @example
 * <Button>
 *   <SendIcon />
 *   Submit
 * </Button>
 */

import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { useCallback, useRef } from "react";

import { cn } from "../utils/cn.ts";
import { useAncestorHover } from "../utils/useAncestorHover.ts";

/** Props for the animated `SendIcon`. */
export interface SendIconProps extends HTMLAttributes<HTMLDivElement> {
  /** SVG intrinsic dimension in pixels. Default 28; the parent's `[&_svg]:size-*` rule typically overrides this. */
  size?: number;
}

export const SendIcon = ({ className, size = 28, ...rest }: SendIconProps): React.ReactElement => {
  const controls = useAnimation();
  const ref = useRef<HTMLDivElement>(null);

  const handleHoverChange = useCallback(
    (hovered: boolean): void => {
      controls.start(hovered ? "animate" : "normal");
    },
    [controls]
  );

  useAncestorHover(ref, '[data-slot="button"]', handleHoverChange);

  return (
    <div ref={ref} className={cn(className)} {...rest}>
      <svg
        className="overflow-visible"
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
        <motion.g
          animate={controls}
          transition={{ duration: 0.5 }}
          variants={{
            normal: { x: 0, y: 0, scale: 1 },
            animate: { x: 3, y: -3, scale: 0.8 },
          }}
        >
          <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
          <path d="m21.854 2.147-10.94 10.939" />
        </motion.g>
        <motion.path
          animate={controls}
          d="M -3 28 C -0.5 26.8 1.6 24.6 3.3 22 C 4.8 19.7 5.2 17.6 4.2 16.1 C 3.2 14.7 1.4 14.5 0.3 15.8 C -0.9 17.2 -0.6 19.4 1.2 20.4 C 3.4 21.5 6.4 19.4 9 15.8"
          fill="none"
          initial={{ opacity: 0, pathLength: 0 }}
          stroke="currentColor"
          strokeDasharray="2 2"
          strokeWidth="1"
          transition={{ duration: 0.55, delay: 0.1 }}
          variants={{
            normal: {
              pathLength: 0,
              opacity: 0,
              translateX: -3,
              translateY: 3,
              transition: { duration: 0.3 },
            },
            animate: {
              pathLength: 1,
              opacity: 1,
              translateX: 0,
              translateY: 0,
            },
          }}
        />
      </svg>
    </div>
  );
};
