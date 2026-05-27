// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./FloatingToolbar.tsx", () => ({
  FloatingToolbar: ({ children }: { children: ReactNode }) => (
    <div data-testid="floating-toolbar-mock">{children}</div>
  ),
}));

import { ToolbarButtons } from "./ReviewEditorToolbar.tsx";

interface ButtonCase {
  testid: string;
  handlerKey: "onComment" | "onInsert" | "onReplace" | "onDelete";
  label: string;
}

const buttons: ButtonCase[] = [
  { testid: "toolbar-comment", handlerKey: "onComment", label: "Comment" },
  { testid: "toolbar-insert", handlerKey: "onInsert", label: "Insert" },
  { testid: "toolbar-replace", handlerKey: "onReplace", label: "Replace" },
  { testid: "toolbar-delete", handlerKey: "onDelete", label: "Delete" },
];

describe("ToolbarButtons", () => {
  it.each(buttons)(
    "$label button click invokes only its $handlerKey handler",
    async ({ testid, handlerKey }) => {
      const user = userEvent.setup();
      const handlers = {
        onComment: vi.fn(),
        onInsert: vi.fn(),
        onReplace: vi.fn(),
        onDelete: vi.fn(),
      };
      render(<ToolbarButtons {...handlers} />);
      await user.click(screen.getByTestId(testid));
      expect(handlers[handlerKey]).toHaveBeenCalledTimes(1);
      for (const other of buttons.filter((b) => b.handlerKey !== handlerKey)) {
        expect(handlers[other.handlerKey]).not.toHaveBeenCalled();
      }
    }
  );

  it.each(buttons)("$label button is labelled with the visible text", ({ testid, label }) => {
    const handlers = {
      onComment: vi.fn(),
      onInsert: vi.fn(),
      onReplace: vi.fn(),
      onDelete: vi.fn(),
    };
    render(<ToolbarButtons {...handlers} />);
    expect(screen.getByTestId(testid).textContent).toContain(label);
  });
});
