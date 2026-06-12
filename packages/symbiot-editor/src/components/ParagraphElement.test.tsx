// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ParagraphElement } from "./ParagraphElement.tsx";

const paragraphNode = { type: "p", children: [{ text: "" }] };

describe("ParagraphElement", () => {
  it("renders a <p> with the editor-paragraph testid and children", () => {
    const { container } = render(
      <ParagraphElement attributes={{ "data-slate-node": "element" }} element={paragraphNode}>
        hello
      </ParagraphElement>
    );
    const p = container.firstElementChild as HTMLElement;
    expect(p.tagName).toBe("P");
    expect(p.getAttribute("data-testid")).toBe("editor-paragraph");
    expect(p.textContent).toBe("hello");
    expect(p.className).toBe("");
  });

  it("preserves Slate-internal attributes spread by Plate", () => {
    const { container } = render(
      <ParagraphElement
        attributes={{ "data-slate-node": "element", "data-slate-test": "x" }}
        element={paragraphNode}
      >
        {null}
      </ParagraphElement>
    );
    const p = container.firstElementChild as HTMLElement;
    expect(p.getAttribute("data-slate-node")).toBe("element");
    expect(p.getAttribute("data-slate-test")).toBe("x");
  });

  it("drops prose margins on list-decorated paragraphs", () => {
    const { container } = render(
      <ParagraphElement attributes={{}} element={{ ...paragraphNode, listStyleType: "disc" }}>
        item
      </ParagraphElement>
    );
    expect((container.firstElementChild as HTMLElement).className).toBe("my-0!");
  });
});
