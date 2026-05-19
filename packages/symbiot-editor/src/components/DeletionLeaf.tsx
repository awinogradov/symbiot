import type { ReactNode } from "react";
import { createPlatePlugin } from "platejs/react";

interface DeletionLeafProps {
  attributes: Record<string, unknown>;
  children: ReactNode;
}

/**
 * Leaf renderer for the `suggestion` mark applied by `applyDeletion`. Wraps the
 * leaf's text in a `<s>` with `line-through` so deletions read like a strike
 * in the original document. The `comment_<id>` marks remain orthogonal so a
 * deletion can also carry a comment if a future flow needs it.
 */
export const DeletionLeaf = ({ attributes, children }: DeletionLeafProps): React.ReactElement => (
  <s {...attributes} className="text-anno-deletion line-through decoration-2">
    {children}
  </s>
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
