import { createSlateEditor } from "platejs";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { SymbiotEditorKit } from "./kit.ts";
import { selectionRect } from "./selectionRect.ts";

beforeAll(() => {
  // The helper reads window.scrollX/Y to convert to document-space coords;
  // the package tests run in node, so stub a minimal browser-like shim.
  Object.defineProperty(globalThis, "window", {
    value: { scrollX: 0, scrollY: 0 },
    writable: true,
  });
});

const createEditor = (): ReturnType<typeof createSlateEditor> =>
  createSlateEditor({
    plugins: SymbiotEditorKit,
    value: [{ type: "p", children: [{ text: "hello world" }] }],
  });

const fakeRangeReturning = (rect: {
  top: number;
  left: number;
  width: number;
  height: number;
}): Range => {
  const obj = { getBoundingClientRect: (): DOMRect => rect as DOMRect };
  return obj as unknown as Range;
};

describe("selectionRect", () => {
  it("returns null when there is no selection", () => {
    const editor = createEditor();
    editor.selection = null;
    expect(selectionRect(editor)).toBeNull();
  });

  it("returns null when the selection is collapsed (a click, not a drag)", () => {
    const editor = createEditor();
    editor.selection = {
      anchor: { path: [0, 0], offset: 3 },
      focus: { path: [0, 0], offset: 3 },
    };
    expect(selectionRect(editor)).toBeNull();
  });

  it("returns null when Plate cannot resolve the range to a DOM range", () => {
    const editor = createEditor();
    editor.selection = {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 5 },
    };
    vi.spyOn(editor.api, "toDOMRange").mockReturnValue(undefined);
    expect(selectionRect(editor)).toBeNull();
  });

  it("returns a document-space rect for an expanded selection with a measurable DOM range", () => {
    const editor = createEditor();
    editor.selection = {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 5 },
    };
    vi.spyOn(editor.api, "toDOMRange").mockReturnValue(
      fakeRangeReturning({ top: 100, left: 50, width: 80, height: 20 })
    );
    expect(selectionRect(editor)).toEqual({
      top: 100 + window.scrollY,
      left: 50 + window.scrollX,
      width: 80,
      height: 20,
    });
  });

  it("returns null when the DOM range has zero size (off-screen or empty)", () => {
    const editor = createEditor();
    editor.selection = {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 5 },
    };
    vi.spyOn(editor.api, "toDOMRange").mockReturnValue(
      fakeRangeReturning({ top: 0, left: 0, width: 0, height: 0 })
    );
    expect(selectionRect(editor)).toBeNull();
  });
});
