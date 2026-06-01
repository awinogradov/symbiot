// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AnnotationSidebar } from "./AnnotationSidebar.tsx";
import type { AnnotationSidebarEntry } from "./AnnotationSidebarTypes.tsx";
import { SidebarProvider } from "./SidebarProvider.tsx";

const entry = (id: string): AnnotationSidebarEntry => ({
  id,
  kind: "comment",
  primary: `p-${id}`,
});

const sidebarMarkup = (
  props: Partial<React.ComponentProps<typeof AnnotationSidebar>> = {}
): React.ReactElement => (
  <SidebarProvider>
    <AnnotationSidebar
      entries={props.entries ?? []}
      onFocus={props.onFocus ?? vi.fn()}
      onRemove={props.onRemove ?? vi.fn()}
      onEdit={props.onEdit ?? vi.fn()}
      onClearAll={props.onClearAll ?? vi.fn()}
      versions={props.versions ?? [1]}
      activeVersion={props.activeVersion ?? 1}
      onSelectVersion={props.onSelectVersion ?? vi.fn()}
      showDiffToggle={props.showDiffToggle ?? false}
      diffMode={props.diffMode ?? "clean"}
      onDiffModeChange={props.onDiffModeChange ?? vi.fn()}
      canCompareWithPredecessor={props.canCompareWithPredecessor ?? false}
      comparingWithPredecessor={props.comparingWithPredecessor ?? false}
      onToggleCompare={props.onToggleCompare ?? vi.fn()}
    />
  </SidebarProvider>
);

const renderSidebar = (
  props: Partial<React.ComponentProps<typeof AnnotationSidebar>> = {}
): ReturnType<typeof render> => render(sidebarMarkup(props));

describe("AnnotationSidebar", () => {
  it("renders the total-count badge with the current entry count", () => {
    renderSidebar({ entries: [entry("a"), entry("b")] });
    expect(screen.getByTestId("sidebar-total-count").textContent).toBe("2");
  });

  it.each([
    { versions: [1], expectHistoryTab: false },
    { versions: [1, 2], expectHistoryTab: true },
  ])(
    "History tab visibility ($expectHistoryTab) follows the >=2-versions rule",
    ({ versions, expectHistoryTab }) => {
      renderSidebar({ versions });
      const tab = screen.queryByTestId("sidebar-tab-history");
      if (expectHistoryTab) expect(tab).not.toBeNull();
      else expect(tab).toBeNull();
    }
  );

  it.each([
    { entries: [], expectClearAll: false },
    { entries: [entry("a")], expectClearAll: true },
  ])(
    "Clear all visibility ($expectClearAll) on the annotations tab follows the entries-present rule",
    ({ entries, expectClearAll }) => {
      renderSidebar({ entries });
      const btn = screen.queryByTestId("sidebar-clear-all");
      if (expectClearAll) expect(btn).not.toBeNull();
      else expect(btn).toBeNull();
    }
  );

  it("hides Clear all after switching from Annotations to History tab", async () => {
    const user = userEvent.setup();
    renderSidebar({ entries: [entry("a")], versions: [1, 2] });
    expect(screen.queryByTestId("sidebar-clear-all")).not.toBeNull();
    await user.click(screen.getByTestId("sidebar-tab-history"));
    expect(screen.queryByTestId("sidebar-clear-all")).toBeNull();
  });

  it("falls back to the annotations tab when the user is on History and versions shrinks below 2", async () => {
    const user = userEvent.setup();
    const entries = [entry("a")];
    const { rerender } = render(sidebarMarkup({ entries, versions: [1, 2] }));
    await user.click(screen.getByTestId("sidebar-tab-history"));
    // Now drop versions to a single one — History tab + content unmount, so the
    // sidebar body must keep showing the annotations list (not go blank).
    rerender(sidebarMarkup({ entries, versions: [1] }));
    expect(screen.queryByTestId("sidebar-tab-history")).toBeNull();
    expect(screen.queryByTestId("sidebar-entry-a")).not.toBeNull();
  });

  it("flipping the diff-mode toggle forwards 'clean'/'raw' to onDiffModeChange and ignores empty values", async () => {
    const user = userEvent.setup();
    const onDiffModeChange = vi.fn();
    renderSidebar({
      versions: [1, 2],
      showDiffToggle: true,
      diffMode: "clean",
      onDiffModeChange,
    });
    await user.click(screen.getByTestId("sidebar-tab-history"));
    await user.click(screen.getByTestId("diff-mode-raw"));
    expect(onDiffModeChange).toHaveBeenCalledWith("raw");
  });
});
