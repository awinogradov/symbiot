// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CodeLineElement } from "./CodeLineElement.tsx";

describe("CodeLineElement", () => {
  it("renders a code-line div carrying its children and the BDD testid", () => {
    render(
      <CodeLineElement attributes={{ "data-slate-node": "element" }}>
        <span>const a = 1</span>
      </CodeLineElement>
    );
    const line = screen.getByTestId("code-line");
    expect(line.tagName).toBe("DIV");
    expect(line.getAttribute("data-slate-node")).toBe("element");
    expect(line.textContent).toBe("const a = 1");
  });
});
