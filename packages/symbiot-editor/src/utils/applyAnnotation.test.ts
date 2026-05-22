import { createSlateEditor } from "platejs";
import { describe, expect, it } from "vitest";

import { applyAnnotation, hasValidSelection, type AnnotationKind } from "./applyAnnotation.ts";
import { SymbiotEditorKit } from "./kit.ts";

const createEditor = (): ReturnType<typeof createSlateEditor> =>
  createSlateEditor({
    plugins: SymbiotEditorKit,
    value: [{ type: "p", children: [{ text: "hello world" }] }],
  });

const kinds: AnnotationKind[] = ["comment", "deletion", "insertion", "replacement"];

describe.each(kinds)("applyAnnotation(%s)", (kind) => {
  it("returns null when there is no selection", () => {
    const editor = createEditor();
    editor.selection = null;
    expect(applyAnnotation(editor, kind)).toBeNull();
  });

  it("returns null when the selection is collapsed", () => {
    const editor = createEditor();
    editor.selection = {
      anchor: { path: [0, 0], offset: 3 },
      focus: { path: [0, 0], offset: 3 },
    };
    expect(applyAnnotation(editor, kind)).toBeNull();
  });

  it("captures anchorText and generates an id when the selection is expanded", () => {
    const editor = createEditor();
    editor.selection = {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 5 },
    };
    const result = applyAnnotation(editor, kind);
    expect(result).not.toBeNull();
    expect(result?.anchorText).toBe("hello");
    expect(result?.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("hasValidSelection", () => {
  it("is false when there is no selection", () => {
    const editor = createEditor();
    editor.selection = null;
    expect(hasValidSelection(editor)).toBe(false);
  });

  it("is false when the selection is collapsed", () => {
    const editor = createEditor();
    editor.selection = {
      anchor: { path: [0, 0], offset: 3 },
      focus: { path: [0, 0], offset: 3 },
    };
    expect(hasValidSelection(editor)).toBe(false);
  });

  it("is true when the selection covers non-empty text", () => {
    const editor = createEditor();
    editor.selection = {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 5 },
    };
    expect(hasValidSelection(editor)).toBe(true);
  });
});
