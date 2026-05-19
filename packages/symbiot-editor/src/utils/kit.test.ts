import { MarkdownPlugin } from "@platejs/markdown";
import { createSlateEditor } from "platejs";
import { describe, expect, it } from "vitest";

import { SymbiotEditorKit } from "./kit.ts";

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
