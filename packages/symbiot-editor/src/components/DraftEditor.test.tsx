// @vitest-environment happy-dom
import { MarkdownPlugin } from "@platejs/markdown";
import { render } from "@testing-library/react";
import { createSlateEditor } from "platejs";
import { describe, expect, it, vi } from "vitest";

import { SymbiotDraftKit } from "../utils/kit.ts";

import { DraftEditor, type DraftEditorHandle } from "./DraftEditor.tsx";

const seed = "# Feature plan\n\nAdd the thing.\n";

describe("draft value pipeline (headless)", () => {
  it("editing the value changes what serializes back to markdown", () => {
    const editor = createSlateEditor({ plugins: SymbiotDraftKit });
    const md = editor.getApi(MarkdownPlugin).markdown;
    editor.children = md.deserialize(seed);
    editor.tf.insertText("Revised: ", { at: { path: [1, 0], offset: 0 } });
    const serialized = md.serialize();
    expect(serialized).toContain("Revised: Add the thing.");
    expect(serialized).toContain("# Feature plan");
  });
});

describe("DraftEditor component", () => {
  it("renders an editable surface and exposes a markdown round-trip handle", () => {
    let handle: DraftEditorHandle | null = null;
    const onReady = vi.fn((h: DraftEditorHandle) => {
      handle = h;
    });
    const { container } = render(<DraftEditor markdown={seed} onReady={onReady} />);

    expect(container.querySelector('[data-testid="draft-editor-root"]')).not.toBeNull();
    // Editable: PlateContent must NOT render contenteditable=false (draft mode types directly).
    const editable = container.querySelector("[contenteditable]");
    expect(editable?.getAttribute("contenteditable")).toBe("true");

    expect(onReady).toHaveBeenCalledTimes(1);
    if (handle === null) throw new Error("onReady did not deliver a handle");
    const roundTripped = (handle as DraftEditorHandle).getMarkdown();
    expect(roundTripped).toContain("# Feature plan");
    expect(roundTripped).toContain("Add the thing.");
  });
});
