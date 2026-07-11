import { MarkdownPlugin } from "@platejs/markdown";
import { createSlateEditor } from "platejs";
import { describe, expect, it } from "vitest";

import { SymbiotDraftKit, SymbiotEditorKit } from "./kit.ts";

describe("SymbiotEditorKit markdown deserialization", () => {
  it("turns `inline code` markdown into a leaf carrying the code mark", () => {
    const editor = createSlateEditor({ plugins: SymbiotEditorKit });
    const value = editor.getApi(MarkdownPlugin).markdown.deserialize("A `command` here.");
    const flat = JSON.stringify(value);
    expect(flat).toContain('"code":true');
    expect(flat).toContain('"command"');
    expect(flat).not.toMatch(/`command`/);
  });
});

describe("SymbiotDraftKit markdown deserialization", () => {
  it("deserializes the markdown surface identically to the review kit", () => {
    const markdown = "# Title\n\nA `command` here.\n\n- item one\n- item two\n";
    const draftEditor = createSlateEditor({ plugins: SymbiotDraftKit });
    const reviewEditor = createSlateEditor({ plugins: SymbiotEditorKit });
    const draftValue = draftEditor.getApi(MarkdownPlugin).markdown.deserialize(markdown);
    const reviewValue = reviewEditor.getApi(MarkdownPlugin).markdown.deserialize(markdown);
    expect(draftValue).toEqual(reviewValue);
  });
});
