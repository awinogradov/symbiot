// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ParagraphElement } from "./ParagraphElement.tsx";

describe("ParagraphElement", () => {
  it("renders a <p> with the editor-paragraph testid and children", () => {
    const { container } = render(
      <ParagraphElement attributes={{ "data-slate-node": "element" }}>hello</ParagraphElement>
    );
    const p = container.firstElementChild as HTMLElement;
    expect(p.tagName).toBe("P");
    expect(p.getAttribute("data-testid")).toBe("editor-paragraph");
    expect(p.textContent).toBe("hello");
  });

  it("preserves Slate-internal attributes spread by Plate", () => {
    const { container } = render(
      <ParagraphElement attributes={{ "data-slate-node": "element", "data-slate-test": "x" }}>
        {null}
      </ParagraphElement>
    );
    const p = container.firstElementChild as HTMLElement;
    expect(p.getAttribute("data-slate-node")).toBe("element");
    expect(p.getAttribute("data-slate-test")).toBe("x");
  });
});
