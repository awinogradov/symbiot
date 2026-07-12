import { ULIST_STYLE_TYPES } from "@platejs/list";
import { cn } from "@symbiot/ui/utils/cn";
import type { TElement } from "platejs";
import type { ReactNode } from "react";

interface ListElementProps {
  attributes: Record<string, unknown>;
  children: ReactNode;
  element: TElement;
}

const unorderedStyles = ULIST_STYLE_TYPES as readonly string[];

const todoStyle = "todo";

/**
 * `todo` (GFM task items) is a Plate list style, not a CSS one. Resolve it to a
 * real marker exactly once, before both the ordered test and the marker style
 * read it — splitting the special case across the two would let them drift, and
 * each half-fix fails silently in its own way: unresolved it fails the unordered
 * membership test and falls through to decimal `<ol>` numbering, and unmapped it
 * reaches CSS as an invalid `list-style-type` and renders no marker at all.
 */
const listStyleAliases: Record<string, string> = { [todoStyle]: "disc" };

const resolveStyle = (listStyleType: string | undefined): string | undefined =>
  listStyleType === undefined ? undefined : (listStyleAliases[listStyleType] ?? listStyleType);

const isOrderedStyle = (listStyleType: string | undefined): boolean =>
  listStyleType !== undefined && !unorderedStyles.includes(listStyleType);

const markerStyle = (listStyleType: string | undefined): React.CSSProperties =>
  listStyleType === undefined ? { margin: 0 } : { listStyleType, margin: 0 };

const listType = (listStyleType: string | undefined, ordered: boolean): string => {
  if (listStyleType === todoStyle) return todoStyle;
  return ordered ? "ordered" : "unordered";
};

/**
 * Renderer for Plate list elements. Mirrors Plate's default rendering — each
 * list-item element becomes its own `<ol>` / `<ul>` (indent-list style; sibling
 * items are visually merged by CSS) — and additionally stamps a
 * `data-testid="editor-list"` plus `data-list-type` attribute so BDD specs can
 * select lists without falling back to the `ul`/`ol` tag names banned by
 * `docs/08-testing.md#playwright-bdd-selectors`. Mirrors the predicate Plate's own
 * `isOrderedList` helper uses (testing membership in `ULIST_STYLE_TYPES`). Wired
 * via `ListPlugin.configure({ render: { belowNodes } })` in `utils/kit.ts`
 * because Plate's list "items" are actually paragraph elements decorated with
 * `listStyleType` — the wrapper renders `belowNodes`, not `withComponent`.
 *
 * GFM task items (`listStyleType: "todo"`) render as ordinary bullets — see
 * {@link listStyleAliases}. The markdown parser consumes the literal `[ ]` /
 * `[x]` into the `checked` flag, so a done item would otherwise be
 * indistinguishable from an open one; it is struck through instead, and carries
 * `data-checked` so the state stays queryable without a form control.
 */
export const ListElement = ({
  attributes,
  children,
  element,
}: ListElementProps): React.ReactElement => {
  const listStyleType = element["listStyleType"] as string | undefined;
  const listStart = element["listStart"] as number | undefined;
  const todo = listStyleType === todoStyle;
  const checked = element["checked"] === true;
  const resolved = resolveStyle(listStyleType);
  const ordered = isOrderedStyle(resolved);
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      {...attributes}
      data-testid="editor-list"
      data-list-type={listType(listStyleType, ordered)}
      start={listStart}
      style={markerStyle(resolved)}
      className="[&_li]:my-0"
    >
      <li
        data-checked={todo ? checked : undefined}
        className={cn(todo && checked && "text-muted-foreground line-through")}
      >
        {children}
      </li>
    </Tag>
  );
};
