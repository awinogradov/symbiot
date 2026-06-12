import { ULIST_STYLE_TYPES } from "@platejs/list";
import type { TElement } from "platejs";
import type { ReactNode } from "react";

interface ListElementProps {
  attributes: Record<string, unknown>;
  children: ReactNode;
  element: TElement;
}

interface TodoListProps {
  attributes: Record<string, unknown>;
  children: ReactNode;
  checked: boolean;
}

const unorderedStyles = ULIST_STYLE_TYPES as readonly string[];

const isOrderedStyle = (listStyleType: string | undefined): boolean =>
  listStyleType !== undefined && !unorderedStyles.includes(listStyleType);

const markerStyle = (listStyleType: string | undefined): React.CSSProperties =>
  listStyleType === undefined ? { margin: 0 } : { listStyleType, margin: 0 };

/**
 * GFM task item: a read-only checkbox marker instead of a CSS marker — `todo`
 * is not a valid `list-style-type`, so without this branch the browser falls
 * back to decimal numbering and the checked state is lost. Not `disabled`:
 * Chrome renders disabled checkboxes gray, ignoring `accent-color`;
 * pointer-events + tabIndex keep it non-interactive instead. The checkbox sits
 * in a `contentEditable={false}` span so Slate never treats it as editable
 * text, and -ml-6 pulls it into the marker gutter (16px box + 8px gap) so item
 * text aligns with the other list kinds.
 */
const TodoList = ({ attributes, children, checked }: TodoListProps): React.ReactElement => (
  <ul
    {...attributes}
    data-testid="editor-list"
    data-list-type="todo"
    style={{ listStyleType: "none", margin: 0 }}
    className="[&_li]:my-0"
  >
    <li className="flex items-start gap-2">
      <span contentEditable={false} className="-ml-6 flex h-7 items-center">
        <input
          type="checkbox"
          data-testid="editor-task-checkbox"
          checked={checked}
          readOnly
          tabIndex={-1}
          aria-label={checked ? "Completed task" : "Open task"}
          className="accent-task-done pointer-events-none size-4"
        />
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  </ul>
);

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
 * GFM task items (`listStyleType: "todo"` + `checked` flag) render via
 * {@link TodoList}.
 */
export const ListElement = ({
  attributes,
  children,
  element,
}: ListElementProps): React.ReactElement => {
  const listStyleType = element["listStyleType"] as string | undefined;
  const listStart = element["listStart"] as number | undefined;
  if (listStyleType === "todo") {
    return (
      <TodoList attributes={attributes} checked={element["checked"] === true}>
        {children}
      </TodoList>
    );
  }
  const ordered = isOrderedStyle(listStyleType);
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      {...attributes}
      data-testid="editor-list"
      data-list-type={ordered ? "ordered" : "unordered"}
      start={listStart}
      style={markerStyle(listStyleType)}
      className="[&_li]:my-0"
    >
      <li>{children}</li>
    </Tag>
  );
};
