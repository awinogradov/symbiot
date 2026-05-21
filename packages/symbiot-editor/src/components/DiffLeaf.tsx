import type { DiffOperation } from "@platejs/diff";
import type { PlateElementProps, PlateLeafProps } from "platejs/react";
import { PlateLeaf } from "platejs/react";

/**
 * Tailwind class string for the diff palette, keyed by operation type. Shared
 * between the leaf renderer (inline-level diffs) and the element wrapper
 * (block-level diffs) so both surfaces use the same `--anno-*` tokens.
 */
export const diffClassFor = (type: DiffOperation["type"]): string => {
  switch (type) {
    case "insert":
      return "text-anno-insert bg-anno-insert/10 rounded-sm px-0.5";
    case "delete":
      return "text-anno-delete bg-anno-delete/10 rounded-sm px-0.5 line-through decoration-2";
    case "update":
      return "text-anno-replace bg-anno-replace/10 rounded-sm px-0.5";
  }
};

const semanticTag = (type: DiffOperation["type"]): "ins" | "del" | "span" => {
  switch (type) {
    case "insert":
      return "ins";
    case "delete":
      return "del";
    case "update":
      return "span";
  }
};

const describeUpdate = (op: DiffOperation): string | undefined => {
  if (op.type !== "update") return undefined;
  const keys = new Set([...Object.keys(op.properties), ...Object.keys(op.newProperties)]);
  if (keys.size === 0) return undefined;
  return `changed ${[...keys].join(", ")}`;
};

/**
 * Render `@platejs/diff` leaf nodes. The diff plugin tags each affected text
 * span with `leaf.diff: true` and `leaf.diffOperation` describing whether the
 * span is an insertion, deletion, or property update. We render those as
 * `<ins>` / `<del>` / `<span>` styled with the project's `--anno-*` palette so
 * the diff and the reviewer-authored suggestion marks read in the same visual
 * language without sharing the same Plate plugin key.
 */
const elementDiffOperation = (element: PlateElementProps["element"]): DiffOperation | null => {
  const node = element as unknown as Record<string, unknown>;
  if (node["diff"] !== true) return null;
  const op = node["diffOperation"] as DiffOperation | undefined;
  return op ?? null;
};

/**
 * `aboveNodes` render hook: wraps block-level diff elements with a tinted
 * container so the reviewer sees inserted / deleted / updated paragraphs at a
 * glance. Inline diffs are handled by `DiffLeaf`; this covers the case where
 * `computeDiff` flags the entire block (e.g. an added heading or paragraph)
 * instead of marking individual leaves.
 */
export const diffElementWrapper =
  () =>
  ({ children, element, editor }: PlateElementProps): React.ReactNode => {
    const op = elementDiffOperation(element);
    // Non-diff elements: return children unchanged. Returning `undefined` here
    // causes Plate to drop the node entirely from the rendered tree.
    if (op === null) return children;
    const Tag = editor.api.isInline(element) ? "span" : "div";
    return (
      <Tag data-diff-block={op.type} className={diffClassFor(op.type)}>
        {children}
      </Tag>
    );
  };

export const DiffLeaf = (props: PlateLeafProps): React.ReactElement => {
  const op = props.leaf["diffOperation"] as DiffOperation | undefined;
  if (op === undefined) {
    return <PlateLeaf {...props}>{props.children}</PlateLeaf>;
  }
  const title = describeUpdate(op);
  return (
    <PlateLeaf
      {...props}
      as={semanticTag(op.type)}
      className={diffClassFor(op.type)}
      attributes={{
        ...props.attributes,
        "data-diff-op": op.type,
        ...(title === undefined ? {} : { title }),
      }}
    >
      {props.children}
    </PlateLeaf>
  );
};
