import type { ReactNode } from "react";
import { createPlatePlugin } from "platejs/react";

interface InsertionLeafProps {
  attributes: Record<string, unknown>;
  children: ReactNode;
}

/**
 * Leaf renderer for the `insertion` mark applied by `applyAnnotation(editor,
 * "insertion")`. The anchor span (the context the new text inserts after)
 * renders with the `--anno-insert` highlight so the reviewer can locate the
 * insertion point in-context. The proposed `newText` is sidebar-only — it is
 * never spliced into the editor value.
 */
export const InsertionLeaf = ({ attributes, children }: InsertionLeafProps): React.ReactElement => (
  <ins
    {...attributes}
    className="text-anno-insert bg-anno-insert/10 rounded-sm px-0.5 no-underline"
  >
    {children}
  </ins>
);

/**
 * Plate plugin that renders any leaf carrying the boolean `insertion: true`
 * mark via `InsertionLeaf`. Sibling to `SuggestionMarkPlugin` (deletion) and
 * the per-mark plugins from `BasicMarksPlugin`.
 */
export const InsertionMarkPlugin = createPlatePlugin({
  key: "insertion",
  node: { isLeaf: true },
}).withComponent(InsertionLeaf);
