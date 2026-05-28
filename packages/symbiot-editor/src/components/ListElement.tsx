import { ULIST_STYLE_TYPES } from "@platejs/list";
import type { TElement } from "platejs";
import type { ReactNode } from "react";

interface ListElementProps {
  attributes: Record<string, unknown>;
  children: ReactNode;
  element: TElement;
}

const unorderedStyles = ULIST_STYLE_TYPES as readonly string[];

/**
 * Renderer for Plate list elements. Mirrors Plate's default rendering — each
 * list-item element becomes its own `<ol>` / `<ul>` (indent-list style; sibling
 * items are visually merged by CSS) — and additionally stamps a
 * `data-testid="editor-list"` plus `data-list-type` attribute so BDD specs can
 * select lists without falling back to the `ul`/`ol` tag names banned by
 * `docs/testing.md#playwright-bdd-selectors`. Mirrors the predicate Plate's own
 * `isOrderedList` helper uses (testing membership in `ULIST_STYLE_TYPES`). Wired
 * via `ListPlugin.configure({ render: { belowNodes } })` in `utils/kit.ts`
 * because Plate's list "items" are actually paragraph elements decorated with
 * `listStyleType` — the wrapper renders `belowNodes`, not `withComponent`.
 */
export const ListElement = ({
  attributes,
  children,
  element,
}: ListElementProps): React.ReactElement => {
  const listStyleType = element["listStyleType"] as string | undefined;
  const listStart = element["listStart"] as number | undefined;
  const ordered = listStyleType !== undefined && !unorderedStyles.includes(listStyleType);
  const Tag = ordered ? "ol" : "ul";
  const style = listStyleType === undefined ? { margin: 0 } : { listStyleType, margin: 0 };
  return (
    <Tag
      {...attributes}
      data-testid="editor-list"
      data-list-type={ordered ? "ordered" : "unordered"}
      start={listStart}
      style={style}
    >
      <li>{children}</li>
    </Tag>
  );
};
