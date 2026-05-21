import { createSlateEditor } from "platejs";
import { describe, expect, it } from "vitest";

import { SymbiotEditorKit } from "./kit.ts";
import { removeAnnotationMark } from "./removeAnnotationMark.ts";

interface TextLeaf {
  text: string;
  [mark: string]: unknown;
}

const leafAt = (children: readonly unknown[], path: number[]): TextLeaf => {
  let current: unknown = { children };
  for (const index of path) {
    current = (current as { children: unknown[] }).children[index];
  }
  return current as TextLeaf;
};

const buildEditor = (
  children: { type: string; children: TextLeaf[] }[]
): ReturnType<typeof createSlateEditor> =>
  createSlateEditor({
    plugins: SymbiotEditorKit,
    value: children,
  });

describe("removeAnnotationMark", () => {
  it("removes the per-id and umbrella comment marks from the only commented leaf", () => {
    const editor = buildEditor([
      { type: "p", children: [{ text: "hello", comment: true, comment_abc: true }] },
    ]);

    removeAnnotationMark(editor, "comment", "abc");

    const leaf = leafAt(editor.children, [0, 0]);
    expect(leaf.comment).toBeUndefined();
    expect(leaf.comment_abc).toBeUndefined();
    expect(leaf.text).toBe("hello");
  });

  it("keeps the umbrella mark when another comment id still tags the leaf", () => {
    const editor = buildEditor([
      {
        type: "p",
        children: [{ text: "shared", comment: true, comment_abc: true, comment_xyz: true }],
      },
    ]);

    removeAnnotationMark(editor, "comment", "abc");

    const leaf = leafAt(editor.children, [0, 0]);
    expect(leaf.comment_abc).toBeUndefined();
    expect(leaf.comment).toBe(true);
    expect(leaf.comment_xyz).toBe(true);
  });

  it("removes only the suggestion mark and leaves a co-located comment alone", () => {
    const editor = buildEditor([
      {
        type: "p",
        children: [
          {
            text: "mixed",
            comment: true,
            comment_abc: true,
            suggestion: true,
            suggestion_del1: true,
          },
        ],
      },
    ]);

    removeAnnotationMark(editor, "deletion", "del1");

    const leaf = leafAt(editor.children, [0, 0]);
    expect(leaf.suggestion).toBeUndefined();
    expect(leaf.suggestion_del1).toBeUndefined();
    expect(leaf.comment).toBe(true);
    expect(leaf.comment_abc).toBe(true);
  });

  it("is a no-op when no leaf carries the target mark", () => {
    const editor = buildEditor([{ type: "p", children: [{ text: "untouched" }] }]);

    removeAnnotationMark(editor, "comment", "missing");

    const leaf = leafAt(editor.children, [0, 0]);
    expect(leaf.text).toBe("untouched");
    expect(Object.keys(leaf)).toEqual(["text"]);
  });
});
