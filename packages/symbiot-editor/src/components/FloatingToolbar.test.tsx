// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import type { MouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";

const useEditorRefMock = vi.fn();
const useEditorSelectionMock = vi.fn();
const selectionRectMock = vi.fn();

vi.mock("platejs/react", () => ({
  useEditorRef: () => useEditorRefMock(),
  useEditorSelection: () => useEditorSelectionMock(),
}));

vi.mock("../utils/selectionRect.ts", () => ({
  selectionRect: (...args: unknown[]) => selectionRectMock(...args),
}));

import { FloatingToolbar, preserveSelection } from "./FloatingToolbar.tsx";

describe("preserveSelection", () => {
  it("calls event.preventDefault so a toolbar click does not collapse the editor selection", () => {
    const preventDefault = vi.fn();
    const event = { preventDefault } as unknown as MouseEvent;
    preserveSelection(event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });
});

describe("FloatingToolbar", () => {
  it("renders the anchor off-screen and keeps the popover closed when there is no editor selection", () => {
    useEditorRefMock.mockReturnValue({});
    useEditorSelectionMock.mockReturnValue(null);
    selectionRectMock.mockReturnValue(null);
    render(
      <FloatingToolbar>
        <button>x</button>
      </FloatingToolbar>
    );
    const anchor = screen.getByTestId("floating-toolbar-anchor");
    expect(anchor.style.top).toBe("-9999px");
    expect(anchor.style.left).toBe("-9999px");
  });

  it("positions the anchor at the selection rect when one is returned", () => {
    useEditorRefMock.mockReturnValue({});
    useEditorSelectionMock.mockReturnValue({ anchor: {}, focus: {} });
    selectionRectMock.mockReturnValue({ top: 50, left: 80, width: 120, height: 18 });
    render(
      <FloatingToolbar>
        <button>x</button>
      </FloatingToolbar>
    );
    const anchor = screen.getByTestId("floating-toolbar-anchor");
    expect(anchor.style.top).toBe("50px");
    expect(anchor.style.left).toBe("80px");
    expect(anchor.style.width).toBe("120px");
    expect(anchor.style.height).toBe("18px");
  });
});
