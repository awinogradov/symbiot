/**
 * @module useDocumentTitle
 *
 * Keeps the browser tab title in sync with the reviewed plan so multiple open
 * review tabs are distinguishable. The write to `document.title` is a deliberate
 * external-system sync (not React-state sync); no unmount restore is needed
 * because the viewer is a single-page app that never tears this down in
 * practice.
 *
 * @example
 * useDocumentTitle(plan.meta.displayName, plan.plan);
 */
import { useEffect } from "react";

import { buildDocumentTitle, firstMarkdownHeading } from "../utils/documentTitle.ts";

/**
 * Set `document.title` to `Symbiot · {displayName} — {planH1}`, collapsing to
 * `Symbiot · {displayName}` when `planMarkdown` has no H1. Primitive args keep
 * the effect dependency stable and the hook decoupled from `PlanResponse`.
 */
export const useDocumentTitle = (displayName: string, planMarkdown: string): void => {
  const title = buildDocumentTitle(displayName, firstMarkdownHeading(planMarkdown));
  useEffect(() => {
    document.title = title;
  }, [title]);
};
