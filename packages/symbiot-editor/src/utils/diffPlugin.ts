import { computeDiff, withGetFragmentExcludeDiff, type DiffOperation } from "@platejs/diff";
import { createSlatePlugin, type Descendant } from "platejs";
import type { PlateEditor } from "platejs/react";
import { toPlatePlugin } from "platejs/react";
import type { PlateValue } from "@symbiot/annotations";

import { diffElementWrapper, DiffLeaf } from "../components/DiffLeaf.tsx";

/**
 * Plate plugin that renders `@platejs/diff` output. Uses key `"diff"` so its
 * leaves never collide with the reviewer-authored `"suggestion"` or
 * `"comment"` marks — diff nodes can never be "accepted" or "rejected" as
 * feedback because no accept/reject UI is wired against the `"diff"` key.
 *
 * The `withGetFragmentExcludeDiff` override prevents diff leaves from leaking
 * into copy/paste fragments — copying a diff selection out of the read-only
 * viewer produces the underlying text without the diff annotations.
 */
export const DiffPlugin = toPlatePlugin(
  createSlatePlugin({
    key: "diff",
    node: { isLeaf: true },
  }).overrideEditor(withGetFragmentExcludeDiff),
  { render: { node: DiffLeaf, aboveNodes: diffElementWrapper } }
);

/**
 * Run `computeDiff` between two deserialized Plate values, returning a new
 * value where changed leaves carry `leaf.diff: true` + `leaf.diffOperation`.
 * The `lineBreakChar: "¶"` option matches Plate's documented version-history
 * example so block-boundary diffs render as visible insertions/deletions
 * rather than vanishing across paragraph breaks.
 */
export const computeDiffValue = (
  previous: PlateValue,
  current: PlateValue,
  editor: PlateEditor
): PlateValue =>
  computeDiff(previous as unknown as Descendant[], current as unknown as Descendant[], {
    isInline: editor.api.isInline,
    lineBreakChar: "¶",
  });

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object";

const hasOwnDiff = (obj: Record<string, unknown>): boolean => {
  if (obj["diff"] === true) return true;
  const op = obj["diffOperation"] as DiffOperation | undefined;
  return op !== undefined;
};

const anyChildHasDiff = (obj: Record<string, unknown>): boolean => {
  const { children } = obj;
  if (!Array.isArray(children)) return false;
  return children.some((child) => containsDiff(child));
};

/**
 * Predicate: does this Plate node (or any descendant) carry diff markings?
 * Used by `pickChangedBlocks` to filter the Clean view down to only the
 * top-level blocks the diff actually touched.
 */
const containsDiff = (node: unknown): boolean => {
  if (!isPlainObject(node)) return false;
  return hasOwnDiff(node) || anyChildHasDiff(node);
};

/**
 * Drop top-level blocks that contain no diff markings. Used to render the
 * "Clean" view — only blocks the diff actually touched survive, preserving
 * their original order. Returns an empty array when `value` has zero changes.
 */
export const pickChangedBlocks = (value: PlateValue): PlateValue =>
  value.filter((block) => containsDiff(block));

/**
 * Predicate: does any node in `value` carry a diff operation? Drives the
 * "no textual differences" empty-state hint so byte-identical version pairs
 * don't render as a blank pane.
 */
export const hasAnyDiff = (value: PlateValue): boolean =>
  value.some((block) => containsDiff(block));
