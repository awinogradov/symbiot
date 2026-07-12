import { createSlateEditor } from "platejs";
import { describe, expect, it } from "vitest";

import {
  applyAnnotation,
  capturePendingAnnotation,
  hasValidSelection,
  materializeAnnotation,
  type AnnotationKind,
} from "./applyAnnotation.ts";
import { SymbiotEditorKit } from "./kit.ts";
import { decoratePendingHighlight } from "./pendingHighlight.ts";

const createEditor = (): ReturnType<typeof createSlateEditor> =>
  createSlateEditor({
    plugins: SymbiotEditorKit,
    value: [
      { type: "p", children: [{ text: "hello world" }] },
      { type: "p", children: [{ text: "second block" }] },
    ],
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

describe("capturePendingAnnotation", () => {
  it("returns null when the selection is missing or collapsed", () => {
    const editor = createEditor();
    editor.selection = null;
    expect(capturePendingAnnotation(editor, "comment")).toBeNull();
    editor.selection = {
      anchor: { path: [0, 0], offset: 3 },
      focus: { path: [0, 0], offset: 3 },
    };
    expect(capturePendingAnnotation(editor, "comment")).toBeNull();
  });

  it("captures the range and decorates it without mutating the model", () => {
    const editor = createEditor();
    editor.selection = {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 5 },
    };
    const before = structuredClone(editor.children);
    const result = capturePendingAnnotation(editor, "comment");
    expect(result?.anchorText).toBe("hello");
    expect(result?.range).toEqual(editor.selection);
    expect(editor.children).toEqual(before);
    const path = [0, 0];
    expect(decoratePendingHighlight(editor, [editor.api.node(path)![0], path])).toEqual([
      { ...editor.selection, comment: true, [`comment_${result!.id}`]: true },
    ]);
  });

  it("unhangs a triple-click selection so the next block is never covered", () => {
    const editor = createEditor();
    editor.selection = {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [1, 0], offset: 0 },
    };
    const result = capturePendingAnnotation(editor, "comment");
    expect(result?.range).toEqual({
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 11 },
    });
  });
});

describe("materializeAnnotation", () => {
  it("writes the same children as the legacy eager applyAnnotation (single block)", () => {
    const selection = {
      anchor: { path: [0, 0], offset: 2 },
      focus: { path: [0, 0], offset: 7 },
    };
    const legacy = createEditor();
    legacy.selection = selection;
    const applied = applyAnnotation(legacy, "comment");
    const fresh = createEditor();
    materializeAnnotation(fresh, "comment", applied!.id, selection);
    expect(fresh.children).toEqual(legacy.children);
  });

  it("writes the same children as the legacy eager applyAnnotation (multi block)", () => {
    const selection = {
      anchor: { path: [0, 0], offset: 6 },
      focus: { path: [1, 0], offset: 6 },
    };
    const legacy = createEditor();
    legacy.selection = selection;
    const applied = applyAnnotation(legacy, "replacement");
    const fresh = createEditor();
    materializeAnnotation(fresh, "replacement", applied!.id, selection);
    expect(fresh.children).toEqual(legacy.children);
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
