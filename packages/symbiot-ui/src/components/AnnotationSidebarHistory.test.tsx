// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { HistoryPanel } from "./AnnotationSidebarHistory.tsx";

const baseProps = {
  versions: [1, 2, 3],
  activeVersion: 2,
  onSelectVersion: vi.fn(),
  diffMode: "clean" as const,
  onDiffModeChange: vi.fn(),
  comparingWithPredecessor: false,
  onToggleCompare: vi.fn(),
};

describe("HistoryPanel", () => {
  it.each([
    {
      label: "both gates false → version-browser only",
      showDiffToggle: false,
      canCompareWithPredecessor: false,
      comparingWithPredecessor: false,
      expectedPresent: ["version-browser"],
      expectedAbsent: ["diff-mode-toggle", "compare-with-previous", "compare-back-to-editing"],
    },
    {
      label: "showDiffToggle adds the diff-mode toggle",
      showDiffToggle: true,
      canCompareWithPredecessor: false,
      comparingWithPredecessor: false,
      expectedPresent: ["version-browser", "diff-mode-toggle"],
      expectedAbsent: ["compare-with-previous", "compare-back-to-editing"],
    },
    {
      label: "canCompareWithPredecessor (inactive) renders compare-with-previous",
      showDiffToggle: false,
      canCompareWithPredecessor: true,
      comparingWithPredecessor: false,
      expectedPresent: ["compare-with-previous"],
      expectedAbsent: ["compare-back-to-editing", "diff-mode-toggle"],
    },
    {
      label: "comparingWithPredecessor swaps to back-to-editing",
      showDiffToggle: false,
      canCompareWithPredecessor: true,
      comparingWithPredecessor: true,
      expectedPresent: ["compare-back-to-editing"],
      expectedAbsent: ["compare-with-previous"],
    },
  ])(
    "$label",
    ({
      showDiffToggle,
      canCompareWithPredecessor,
      comparingWithPredecessor,
      expectedPresent,
      expectedAbsent,
    }) => {
      render(
        <HistoryPanel
          {...baseProps}
          showDiffToggle={showDiffToggle}
          canCompareWithPredecessor={canCompareWithPredecessor}
          comparingWithPredecessor={comparingWithPredecessor}
        />
      );
      for (const id of expectedPresent) expect(screen.queryByTestId(id)).not.toBeNull();
      for (const id of expectedAbsent) expect(screen.queryByTestId(id)).toBeNull();
    }
  );

  it("clicking the compare button invokes onToggleCompare", async () => {
    const user = userEvent.setup();
    const onToggleCompare = vi.fn();
    render(
      <HistoryPanel
        {...baseProps}
        showDiffToggle={false}
        canCompareWithPredecessor
        onToggleCompare={onToggleCompare}
      />
    );
    await user.click(screen.getByTestId("compare-with-previous"));
    expect(onToggleCompare).toHaveBeenCalledTimes(1);
  });
});
