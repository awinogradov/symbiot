/**
 * Typing guard for the review editor. Plate runs in read-only mode so the
 * agent's plan text can never be edited; annotation marks are mutated via
 * `editor.tf.*` transforms, which bypass DOM `contenteditable=false` entirely.
 * This module intercepts typing-adjacent DOM events on the editor host at the
 * capture phase so the Slate model stays frozen even if `<PlateContent
 * readOnly />` semantics change in a future Plate release.
 */
import { useEffect, type RefObject } from "react";

const blockedEvents = ["beforeinput", "paste", "drop", "cut", "dragstart"] as const;

const block = (event: Event): void => {
  event.preventDefault();
  event.stopPropagation();
};

/**
 * Belt-and-suspenders typing block on the editable surface. `<PlateContent
 * readOnly />` already sets `contenteditable=false`, but intercepting these
 * events at capture phase guarantees no transient DOM mutations leak into the
 * Slate model even if a future Plate release changes its readOnly semantics.
 */
export const useTypingGuard = (containerRef: RefObject<HTMLElement | null>): void => {
  useEffect(() => {
    const node = containerRef.current;
    if (node === null) return;
    for (const name of blockedEvents) node.addEventListener(name, block, true);
    return () => {
      for (const name of blockedEvents) node.removeEventListener(name, block, true);
    };
  }, [containerRef]);
};
