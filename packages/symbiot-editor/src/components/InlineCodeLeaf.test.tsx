// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InlineCodeLeaf } from "./InlineCodeLeaf.tsx";

describe("InlineCodeLeaf", () => {
  it("renders <code> with the editor-code-inline testid and Plate attributes", () => {
    const { container } = render(
      <InlineCodeLeaf attributes={{ "data-slate-leaf": "true" }}>foo()</InlineCodeLeaf>
    );
    const code = container.firstElementChild as HTMLElement;
    expect(code.tagName).toBe("CODE");
    expect(code.getAttribute("data-testid")).toBe("editor-code-inline");
    expect(code.getAttribute("data-slate-leaf")).toBe("true");
    expect(code.textContent).toBe("foo()");
  });
});
