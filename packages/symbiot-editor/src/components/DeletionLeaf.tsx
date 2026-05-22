import { createPlatePlugin } from "platejs/react";

import { createAnnotationLeaf } from "./createAnnotationLeaf.tsx";

/**
 * Leaf renderer for the `suggestion` mark applied by `applyDeletion`. Wraps the
 * leaf's text in a `<s>` with `line-through` so deletions read like a strike
 * in the original document. The `comment_<id>` marks remain orthogonal so a
 * deletion can also carry a comment if a future flow needs it.
 */
export const DeletionLeaf = createAnnotationLeaf(
  "s",
  "text-anno-delete bg-anno-delete/10 rounded-sm px-0.5 line-through decoration-2",
  "DeletionLeaf"
);

/**
 * Plate plugin that renders any leaf carrying the boolean `suggestion: true`
 * mark via `DeletionLeaf`. Sibling to BasicMarksPlugin's per-mark plugins
 * (bold/italic/etc.), so it never collides with their rendering.
 */
export const SuggestionMarkPlugin = createPlatePlugin({
  key: "suggestion",
  node: { isLeaf: true },
}).withComponent(DeletionLeaf);
