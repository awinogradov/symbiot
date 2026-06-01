// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SendIcon } from "./SendIcon.tsx";

describe("SendIcon", () => {
  it("renders the plane and the CSS-animated trail", () => {
    const { container } = render(
      <div data-slot="button">
        <SendIcon />
      </div>
    );
    expect(container.querySelector("g.symbiot-send-plane")).not.toBeNull();
    const trail = container.querySelector("path.symbiot-send-trail");
    if (trail === null) throw new Error("trail path is missing");
    // pathLength normalizes the dash units the hover transition animates.
    expect(trail.getAttribute("pathLength")).toBe("1");
  });

  it("forwards className onto the wrapping div", () => {
    const { container } = render(
      <div data-slot="button">
        <SendIcon className="text-fg" />
      </div>
    );
    const icon = container.querySelector(".text-fg");
    if (icon === null) throw new Error("className was not forwarded");
    expect(icon.className).toContain("symbiot-icon");
  });
});
