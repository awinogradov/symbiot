// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HrElement } from "./VoidElements.tsx";

describe("HrElement", () => {
  it("wraps an <hr> in a contentEditable=false block and hides Slate children", () => {
    const { container } = render(
      <HrElement attributes={{ "data-slate-node": "element" }}>
        <span data-testid="slate-text">zero-width</span>
      </HrElement>
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.tagName).toBe("DIV");
    expect(wrapper.getAttribute("contenteditable")).toBe("false");
    expect(wrapper.querySelector("hr")).not.toBeNull();
    const hidden = wrapper.querySelector("span.hidden");
    expect(hidden?.textContent).toBe("zero-width");
  });

  it("passes attributes through to the wrapper div", () => {
    const { container } = render(<HrElement attributes={{ "data-x": "y" }}>{null}</HrElement>);
    expect(container.firstElementChild?.getAttribute("data-x")).toBe("y");
  });
});
