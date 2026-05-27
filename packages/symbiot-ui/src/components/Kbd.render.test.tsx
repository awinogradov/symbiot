// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Kbd } from "./Kbd.tsx";

describe("Kbd render", () => {
  it("renders children inside a <kbd> with the kbd data-slot", () => {
    const { container } = render(<Kbd>C</Kbd>);
    const kbd = container.querySelector("kbd");
    expect(kbd).not.toBeNull();
    expect(kbd?.textContent).toBe("C");
    expect(kbd?.getAttribute("data-slot")).toBe("kbd");
  });

  it("merges custom className", () => {
    const { container } = render(<Kbd className="my-extra">X</Kbd>);
    expect(container.querySelector("kbd")?.className).toContain("my-extra");
  });
});
