// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppLogo } from "./AppLogo.tsx";

// `AppLogo` is otherwise a static SVG; the only branching logic worth covering
// is the `strokeWidthFor` ramp, exercised at each boundary.
describe("AppLogo strokeWidth ramp", () => {
  it.each([
    [16, "1.6"],
    [20, "2"],
    [24, "2"],
    [28, "2.4"],
    [40, "2.4"],
  ])("size=%i yields stroke-width=%s", (size, expected) => {
    const { container } = render(<AppLogo size={size} />);
    const svg = container.querySelector("svg");
    if (svg === null) throw new Error("AppLogo did not render an <svg>");
    expect(svg.getAttribute("stroke-width")).toBe(expected);
  });

  it("defaults size to 20 when no prop is provided", () => {
    const { container } = render(<AppLogo />);
    const svg = container.querySelector("svg");
    if (svg === null) throw new Error("AppLogo did not render an <svg>");
    expect(svg.getAttribute("width")).toBe("20");
  });
});
