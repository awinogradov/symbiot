// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CodeLineElement } from "./CodeLineElement.tsx";

describe("CodeLineElement", () => {
  it("renders a block-display code-line span carrying its children and the BDD testid", () => {
    render(
      <CodeLineElement attributes={{ "data-slate-node": "element" }}>
        <span>const a = 1</span>
      </CodeLineElement>
    );
    const line = screen.getByTestId("code-line");
    // A span (phrasing content) stays valid inside <pre><code>; `block` stacks lines.
    expect(line.tagName).toBe("SPAN");
    expect(line.className).toContain("block");
    expect(line.getAttribute("data-slate-node")).toBe("element");
    expect(line.textContent).toBe("const a = 1");
  });
});
