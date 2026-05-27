import { createPlatePlugin } from "platejs/react";

import { createAnnotationLeaf } from "./createAnnotationLeaf.tsx";

/**
 * Leaf renderer for the `replacement` mark applied by `applyAnnotation(editor,
 * "replacement")`. The anchored original span renders with the `--anno-replace`
 * highlight so the reviewer can locate the span the suggestion targets. The
 * proposed `replacementText` is sidebar-only — it is never spliced into the
 * editor value. Original and proposed are both visible: the anchor stays
 * readable in-context (`<mark>`, not `<del>`), and the sidebar entry pairs
 * the original primary line with the replacement body below it.
 */
export const ReplacementLeaf = createAnnotationLeaf(
  "mark",
  "text-anno-replace bg-anno-replace/10 rounded-sm px-0.5",
  "ReplacementLeaf"
);

/**
 * Plate plugin that renders any leaf carrying the boolean `replacement: true`
 * mark via `ReplacementLeaf`. Sibling to `SuggestionMarkPlugin` (deletion) and
 * `InsertionMarkPlugin`.
 */
export const ReplacementMarkPlugin = createPlatePlugin({
  key: "replacement",
  node: { isLeaf: true },
}).withComponent(ReplacementLeaf);
