// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CodeBlockElement } from "./CodeBlockElement.tsx";

describe("CodeBlockElement", () => {
  it("renders selectable children inside a .shiki <pre><code> and exposes data-lang", () => {
    render(
      <CodeBlockElement attributes={{ "data-slate-node": "element" }} element={{ lang: "ts" }}>
        <span>const a = 1</span>
      </CodeBlockElement>
    );
    const block = screen.getByTestId("code-block");
    expect(block.tagName).toBe("PRE");
    expect(block.className).toContain("shiki");
    expect(block.getAttribute("data-lang")).toBe("ts");
    expect(block.querySelector("code")?.textContent).toBe("const a = 1");
    // No contentEditable=false wrapper — the code must stay selectable/annotatable.
    expect(block.getAttribute("contenteditable")).toBeNull();
  });

  it("defaults data-lang to text when the element has no language", () => {
    render(
      <CodeBlockElement attributes={{}} element={{}}>
        <span>code</span>
      </CodeBlockElement>
    );
    expect(screen.getByTestId("code-block").getAttribute("data-lang")).toBe("text");
  });
});
