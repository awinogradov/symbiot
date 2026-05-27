// @vitest-environment happy-dom
import { fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const animationControls = { start: vi.fn() };

vi.mock("motion/react", () => ({
  useAnimation: () => animationControls,
  motion: {
    path: ({ children, ...rest }: { children?: ReactNode; [k: string]: unknown }) => (
      <path data-testid="motion-path" {...rest}>
        {children}
      </path>
    ),
  },
}));

import { CheckIcon } from "./CheckIcon.tsx";

describe("CheckIcon", () => {
  it("renders an svg containing the motion-path", () => {
    const { container } = render(
      <div data-slot="button">
        <CheckIcon />
      </div>
    );
    const svg = container.querySelector("svg");
    if (svg === null) throw new Error("CheckIcon did not render an <svg>");
    expect(svg.querySelector('[data-testid="motion-path"]')).not.toBeNull();
  });

  it("forwards arbitrary HTML attributes (className, data-*) onto the wrapping div", () => {
    const { container } = render(
      <div data-slot="button">
        <CheckIcon className="text-fg" data-x="y" />
      </div>
    );
    const wrapper = container.querySelector("[data-x=y]");
    if (wrapper === null) throw new Error("attributes were not forwarded");
    expect(wrapper.className).toContain("text-fg");
  });

  it("starts the 'animate' variant on ancestor mouseenter and 'normal' on mouseleave", () => {
    animationControls.start.mockClear();
    const { container } = render(
      <div data-slot="button">
        <CheckIcon />
      </div>
    );
    const button = container.querySelector('[data-slot="button"]');
    if (button === null) throw new Error("ancestor button is missing");

    fireEvent.mouseEnter(button);
    expect(animationControls.start).toHaveBeenLastCalledWith("animate");

    fireEvent.mouseLeave(button);
    expect(animationControls.start).toHaveBeenLastCalledWith("normal");
    expect(animationControls.start).toHaveBeenCalledTimes(2);
  });

  it("falls back to listening on the icon itself when no ancestor matches the slot selector", () => {
    animationControls.start.mockClear();
    const { container } = render(<CheckIcon data-testid="standalone" />);
    const standalone = container.querySelector('[data-testid="standalone"]');
    if (standalone === null) throw new Error("standalone icon missing");
    fireEvent.mouseEnter(standalone);
    expect(animationControls.start).toHaveBeenLastCalledWith("animate");
  });
});
