// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GlobalCommentFab } from "./GlobalCommentFab.tsx";

describe("GlobalCommentFab", () => {
  it("opens the composer in uncontrolled mode when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<GlobalCommentFab onAddGlobalComment={vi.fn()} />);
    expect(screen.queryByTestId("global-comment-composer")).toBeNull();
    await user.click(screen.getByTestId("editor-global-comment"));
    expect(screen.queryByTestId("global-comment-composer")).not.toBeNull();
  });

  it("disables the trigger when disabled prop is true", () => {
    render(<GlobalCommentFab onAddGlobalComment={vi.fn()} disabled />);
    expect(screen.getByTestId<HTMLButtonElement>("editor-global-comment").disabled).toBe(true);
  });

  it("forwards open=true into the composer and cancel propagates onOpenChange(false) in controlled mode", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<GlobalCommentFab onAddGlobalComment={vi.fn()} open onOpenChange={onOpenChange} />);
    expect(screen.queryByTestId("global-comment-composer")).not.toBeNull();
    await user.click(screen.getByTestId("global-composer-cancel"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("invokes onAddGlobalComment with body + images and closes the composer on save", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<GlobalCommentFab onAddGlobalComment={onAdd} />);
    await user.click(screen.getByTestId("editor-global-comment"));
    await user.type(screen.getByTestId("global-composer-textarea"), "hi{Enter}");
    expect(onAdd).toHaveBeenCalledWith("hi", []);
  });
});
