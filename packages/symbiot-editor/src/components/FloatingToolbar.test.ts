import type { MouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";

import { preserveSelection } from "./FloatingToolbar.tsx";

describe("preserveSelection", () => {
  it("calls event.preventDefault so a toolbar click does not collapse the editor selection", () => {
    const preventDefault = vi.fn();
    const event = { preventDefault } as unknown as MouseEvent;
    preserveSelection(event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });
});
