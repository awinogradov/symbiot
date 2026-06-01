// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CheckIcon } from "./CheckIcon.tsx";

describe("CheckIcon", () => {
  it("renders an svg containing the CSS-animated check path", () => {
    const { container } = render(
      <div data-slot="button">
        <CheckIcon />
      </div>
    );
    const svg = container.querySelector("svg");
    if (svg === null) throw new Error("CheckIcon did not render an <svg>");
    const path = svg.querySelector("path.symbiot-check-path");
    if (path === null) throw new Error("check path is missing");
    // pathLength normalizes the dash units the hover keyframe animates.
    expect(path.getAttribute("pathLength")).toBe("1");
  });

  it("forwards arbitrary HTML attributes (className, data-*) onto the wrapping div", () => {
    const { container } = render(
      <div data-slot="button">
        <CheckIcon className="text-fg" data-x="y" />
      </div>
    );
    const wrapper = container.querySelector("[data-x=y]");
    if (wrapper === null) throw new Error("attributes were not forwarded");
    // Forwarded className sits alongside the standalone-hover hook class.
    expect(wrapper.className).toContain("text-fg");
    expect(wrapper.className).toContain("symbiot-icon");
  });
});
