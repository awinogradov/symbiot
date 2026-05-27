// @vitest-environment happy-dom
import { fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const animationControls = { start: vi.fn() };

vi.mock("motion/react", () => ({
  useAnimation: () => animationControls,
  motion: {
    g: ({ children, ...rest }: { children?: ReactNode; [k: string]: unknown }) => (
      <g data-testid="motion-g" {...rest}>
        {children}
      </g>
    ),
    path: ({ children, ...rest }: { children?: ReactNode; [k: string]: unknown }) => (
      <path data-testid="motion-path" {...rest}>
        {children}
      </path>
    ),
  },
}));

import { SendIcon } from "./SendIcon.tsx";

describe("SendIcon", () => {
  it("renders the plane (motion.g) and the trail (motion.path)", () => {
    const { container } = render(
      <div data-slot="button">
        <SendIcon />
      </div>
    );
    expect(container.querySelector('[data-testid="motion-g"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="motion-path"]')).not.toBeNull();
  });

  it("starts the 'animate' variant on ancestor mouseenter and 'normal' on mouseleave", () => {
    animationControls.start.mockClear();
    const { container } = render(
      <div data-slot="button">
        <SendIcon />
      </div>
    );
    const button = container.querySelector('[data-slot="button"]');
    if (button === null) throw new Error("ancestor button is missing");
    fireEvent.mouseEnter(button);
    expect(animationControls.start).toHaveBeenLastCalledWith("animate");
    fireEvent.mouseLeave(button);
    expect(animationControls.start).toHaveBeenLastCalledWith("normal");
  });

  it("forwards className onto the wrapping div", () => {
    const { container } = render(
      <div data-slot="button">
        <SendIcon className="text-fg" />
      </div>
    );
    const icon = container.querySelector(".text-fg");
    expect(icon).not.toBeNull();
  });
});
