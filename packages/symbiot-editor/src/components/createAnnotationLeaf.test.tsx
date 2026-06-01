// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createAnnotationLeaf } from "./createAnnotationLeaf.tsx";

describe("createAnnotationLeaf", () => {
  it("renders the given tag with the given className, testid, and passes attributes through", () => {
    const Leaf = createAnnotationLeaf("mark", "test-class rounded", "TestLeaf", "annotation-test");
    const { container } = render(<Leaf attributes={{ "data-slate-leaf": true }}>hello</Leaf>);
    const mark = container.querySelector("mark");
    expect(mark).not.toBeNull();
    expect(mark?.className).toBe("test-class rounded");
    expect(mark?.getAttribute("data-testid")).toBe("annotation-test");
    expect(mark?.getAttribute("data-slate-leaf")).toBe("true");
    expect(mark?.textContent).toBe("hello");
  });

  it("sets the React displayName so React DevTools surface the kind", () => {
    const Leaf = createAnnotationLeaf("s", "x", "ScratchedLeaf", "annotation-scratch");
    expect(Leaf.displayName).toBe("ScratchedLeaf");
  });

  it("renders with different tag names per call so each annotation kind gets its own semantic element", () => {
    const Ins = createAnnotationLeaf("ins", "insert", "Ins", "annotation-ins");
    const Del = createAnnotationLeaf("s", "delete", "Del", "annotation-del");
    const { container: insCont } = render(<Ins attributes={{}}>x</Ins>);
    const { container: delCont } = render(<Del attributes={{}}>y</Del>);
    expect(insCont.querySelector("ins")).not.toBeNull();
    expect(delCont.querySelector("s")).not.toBeNull();
  });
});
