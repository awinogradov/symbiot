import { createSlateEditor } from "platejs";
import { describe, expect, it } from "vitest";

import { applyComment } from "./applyComment.ts";
import { SymbiotEditorKit } from "./kit.ts";

const createEditor = (): ReturnType<typeof createSlateEditor> =>
  createSlateEditor({
    plugins: SymbiotEditorKit,
    value: [{ type: "p", children: [{ text: "hello world" }] }],
  });

describe("applyComment", () => {
  it("returns null when there is no selection", () => {
    const editor = createEditor();
    editor.selection = null;
    expect(applyComment(editor)).toBeNull();
  });

  it("returns null when the selection is collapsed — the case that breaks if a toolbar click steals selection", () => {
    const editor = createEditor();
    editor.selection = {
      anchor: { path: [0, 0], offset: 3 },
      focus: { path: [0, 0], offset: 3 },
    };
    expect(applyComment(editor)).toBeNull();
  });

  it("captures originalText and generates an id when the selection is expanded", () => {
    const editor = createEditor();
    editor.selection = {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 5 },
    };
    const result = applyComment(editor);
    expect(result).not.toBeNull();
    expect(result?.originalText).toBe("hello");
    expect(result?.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
