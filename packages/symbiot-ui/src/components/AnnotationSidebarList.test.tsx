// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnnotationList } from "./AnnotationSidebarList.tsx";
import type { AnnotationSidebarEntry } from "./AnnotationSidebarTypes.tsx";

const entry = (
  id: string,
  overrides: Partial<AnnotationSidebarEntry> = {}
): AnnotationSidebarEntry => ({
  id,
  kind: "comment",
  primary: `primary-${id}`,
  ...overrides,
});

describe("AnnotationList", () => {
  it("renders the empty-state message in place of any rows when entries is empty", () => {
    render(<AnnotationList entries={[]} onFocus={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText("No annotations yet.")).not.toBeNull();
    expect(screen.queryByTestId(/^sidebar-entry-/)).toBeNull();
  });

  it("renders one EntryRow per entry and forwards the data-kind from the model", () => {
    render(
      <AnnotationList
        entries={[entry("a"), entry("b", { kind: "deletion" })]}
        onFocus={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByTestId("sidebar-entry-a").getAttribute("data-kind")).toBe("comment");
    expect(screen.getByTestId("sidebar-entry-b").getAttribute("data-kind")).toBe("deletion");
  });
});
