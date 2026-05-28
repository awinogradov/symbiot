// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HeadingElement } from "./HeadingElement.tsx";

describe("HeadingElement", () => {
  it("renders the matching heading tag with a level-specific testid", () => {
    const { container } = render(
      <HeadingElement attributes={{ "data-slate-node": "element" }} element={{ type: "h2" }}>
        section title
      </HeadingElement>
    );
    const heading = container.firstElementChild as HTMLElement;
    expect(heading.tagName).toBe("H2");
    expect(heading.getAttribute("data-testid")).toBe("editor-heading-2");
    expect(heading.textContent).toBe("section title");
  });

  it("renders h6 with editor-heading-6", () => {
    const { container } = render(
      <HeadingElement attributes={{ "data-slate-node": "element" }} element={{ type: "h6" }}>
        x
      </HeadingElement>
    );
    expect(container.firstElementChild?.tagName).toBe("H6");
    expect(container.firstElementChild?.getAttribute("data-testid")).toBe("editor-heading-6");
  });
});
