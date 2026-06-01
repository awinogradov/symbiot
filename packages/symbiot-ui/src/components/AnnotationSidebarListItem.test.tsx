// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EntryRow } from "./AnnotationSidebarListItem.tsx";
import type { AnnotationSidebarEntry } from "./AnnotationSidebarTypes.tsx";

const entry = (overrides: Partial<AnnotationSidebarEntry> = {}): AnnotationSidebarEntry => ({
  id: "e1",
  kind: "comment",
  primary: "anchor",
  ...overrides,
});

describe("EntryRow", () => {
  it("renders the kind label, primary text, and body when present", () => {
    render(
      <EntryRow
        entry={entry({ body: "the body" })}
        onFocus={vi.fn()}
        onRemove={vi.fn()}
        onEdit={vi.fn()}
      />
    );
    const row = screen.getByTestId("sidebar-entry-e1");
    expect(row.textContent).toContain("Comment");
    expect(row.textContent).toContain("anchor");
    expect(row.textContent).toContain("the body");
  });

  it("shows the drifted badge when entry.drifted is true and omits it otherwise", () => {
    const { rerender } = render(
      <EntryRow
        entry={entry({ drifted: true })}
        onFocus={vi.fn()}
        onRemove={vi.fn()}
        onEdit={vi.fn()}
      />
    );
    expect(screen.queryByTestId("sidebar-entry-e1-drift")).not.toBeNull();
    rerender(<EntryRow entry={entry()} onFocus={vi.fn()} onRemove={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.queryByTestId("sidebar-entry-e1-drift")).toBeNull();
  });

  it("renders the line-range when entry.lines is provided", () => {
    render(
      <EntryRow
        entry={entry({ lines: { startLine: 3, endLine: 7 } })}
        onFocus={vi.fn()}
        onRemove={vi.fn()}
        onEdit={vi.fn()}
      />
    );
    expect(screen.getByTestId("sidebar-entry-e1").textContent).toContain("lines 3–7");
  });

  it("clicking the row invokes onFocus with the entry id", async () => {
    const user = userEvent.setup();
    const onFocus = vi.fn();
    render(<EntryRow entry={entry()} onFocus={onFocus} onRemove={vi.fn()} onEdit={vi.fn()} />);
    await user.click(screen.getByTestId("sidebar-entry-e1"));
    expect(onFocus).toHaveBeenCalledWith("e1");
  });

  it("shows the edit pencil for body-bearing kinds and fires onEdit with the entry", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onFocus = vi.fn();
    const target = entry({ kind: "comment" });
    render(<EntryRow entry={target} onFocus={onFocus} onRemove={vi.fn()} onEdit={onEdit} />);
    await user.click(screen.getByTestId("sidebar-entry-e1-edit"));
    expect(onEdit).toHaveBeenCalledWith(target);
    expect(onFocus).not.toHaveBeenCalled();
  });

  it("hides the edit pencil for deletion (remove-only) entries", () => {
    render(
      <EntryRow
        entry={entry({ kind: "deletion" })}
        onFocus={vi.fn()}
        onRemove={vi.fn()}
        onEdit={vi.fn()}
      />
    );
    expect(screen.queryByTestId("sidebar-entry-e1-edit")).toBeNull();
    expect(screen.queryByTestId("sidebar-entry-e1-remove")).not.toBeNull();
  });

  it("pointer-down on the remove trigger does not bubble up to the parent menu item", async () => {
    const user = userEvent.setup();
    const onFocus = vi.fn();
    render(<EntryRow entry={entry()} onFocus={onFocus} onRemove={vi.fn()} onEdit={vi.fn()} />);
    await user.pointer({
      keys: "[MouseLeft>]",
      target: screen.getByTestId("sidebar-entry-e1-remove"),
    });
    expect(onFocus).not.toHaveBeenCalled();
  });
});
