/**
 * @module useAncestorHover
 * Drives hover-triggered animations from the closest interactive ancestor
 * matched by a CSS selector, not from the element the hook is attached to.
 *
 * Animated icons sit inside `<Button>` whose hover area is larger than the
 * icon glyph itself; listening on the icon would leave the button label
 * inert. The hook resolves the ancestor on mount and falls back to the
 * referenced element when no match is found, so consumers can use the
 * icon standalone without losing animation.
 *
 * @example
 * const ref = useRef<HTMLDivElement>(null);
 * const controls = useAnimation();
 * const onHoverChange = useCallback(
 *   (hovered: boolean) => controls.start(hovered ? "animate" : "normal"),
 *   [controls]
 * );
 * useAncestorHover(ref, '[data-slot="button"]', onHoverChange);
 */

import type { RefObject } from "react";
import { useEffect } from "react";

/**
 * Subscribes to `mouseenter`/`mouseleave` on the closest ancestor of `ref`
 * matching `selector`. Falls back to `ref.current` itself when no ancestor
 * matches, preserving hover behavior for standalone usage.
 */
export const useAncestorHover = (
  ref: RefObject<HTMLElement | null>,
  selector: string,
  onHoverChange: (hovered: boolean) => void
): void => {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const target: Element = node.closest(selector) ?? node;
    const handleEnter = (): void => {
      onHoverChange(true);
    };
    const handleLeave = (): void => {
      onHoverChange(false);
    };
    target.addEventListener("mouseenter", handleEnter);
    target.addEventListener("mouseleave", handleLeave);
    return (): void => {
      target.removeEventListener("mouseenter", handleEnter);
      target.removeEventListener("mouseleave", handleLeave);
    };
  }, [ref, selector, onHoverChange]);
};
