import type { ReactNode } from "react";
import { createPlatePlugin } from "platejs/react";

interface ReplacementLeafProps {
  attributes: Record<string, unknown>;
  children: ReactNode;
}

/**
 * Leaf renderer for the `replacement` mark applied by `applyAnnotation(editor,
 * "replacement")`. The anchored original span renders with the `--anno-replace`
 * highlight so the reviewer can locate the span the suggestion targets. The
 * proposed `replacementText` is sidebar-only — it is never spliced into the
 * editor value. Per PRD §6.6, original and proposed are both visible: the
 * anchor stays readable in-context (`<mark>`, not `<del>`), and the sidebar
 * entry pairs the original primary line with the replacement body below it.
 */
export const ReplacementLeaf = ({
  attributes,
  children,
}: ReplacementLeafProps): React.ReactElement => (
  <mark {...attributes} className="text-anno-replace bg-anno-replace/10 rounded-sm px-0.5">
    {children}
  </mark>
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
