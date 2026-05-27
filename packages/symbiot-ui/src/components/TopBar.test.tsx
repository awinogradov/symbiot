// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SidebarProvider } from "./SidebarProvider.tsx";
import { ThemeProvider } from "./ThemeProvider.tsx";
import { TopBar } from "./TopBar.tsx";

const renderTopBar = (props: Partial<React.ComponentProps<typeof TopBar>> = {}) =>
  render(
    <ThemeProvider defaultTheme="system">
      <SidebarProvider>
        <TopBar
          onApprove={props.onApprove ?? vi.fn()}
          onDeny={props.onDeny ?? vi.fn()}
          projectName={props.projectName ?? "demo"}
          busy={props.busy}
          mode={props.mode}
          showSidebarTrigger={props.showSidebarTrigger}
          hasAnnotations={props.hasAnnotations}
        />
      </SidebarProvider>
    </ThemeProvider>
  );

interface ActionCase {
  label: string;
  mode: "plan" | "annotate";
  hasAnnotations: boolean;
  expectedTestId: "top-bar-approve" | "top-bar-deny";
  expectedText: string;
}

const actionCases: ActionCase[] = [
  {
    label: "plan / no annotations → Approve",
    mode: "plan",
    hasAnnotations: false,
    expectedTestId: "top-bar-approve",
    expectedText: "Approve",
  },
  {
    label: "plan / annotations → Request changes",
    mode: "plan",
    hasAnnotations: true,
    expectedTestId: "top-bar-deny",
    expectedText: "Request changes",
  },
  {
    label: "annotate → Submit feedback",
    mode: "annotate",
    hasAnnotations: false,
    expectedTestId: "top-bar-deny",
    expectedText: "Submit feedback",
  },
];

describe("TopBar", () => {
  it.each(actionCases)("$label", ({ mode, hasAnnotations, expectedTestId, expectedText }) => {
    renderTopBar({ mode, hasAnnotations });
    expect(screen.getByTestId(expectedTestId).textContent).toContain(expectedText);
    const otherTestId = expectedTestId === "top-bar-approve" ? "top-bar-deny" : "top-bar-approve";
    expect(screen.queryByTestId(otherTestId)).toBeNull();
  });

  it("busy disables the action button", () => {
    renderTopBar({ busy: true, hasAnnotations: false });
    expect(screen.getByTestId<HTMLButtonElement>("top-bar-approve").disabled).toBe(true);
  });

  it.each([
    { showSidebarTrigger: true, present: true },
    { showSidebarTrigger: false, present: false },
  ])(
    "sidebar trigger visibility ($present) tracks showSidebarTrigger=$showSidebarTrigger",
    ({ showSidebarTrigger, present }) => {
      renderTopBar({ showSidebarTrigger });
      const trigger = screen.queryByTestId("top-bar-sidebar-trigger");
      if (present) expect(trigger).not.toBeNull();
      else expect(trigger).toBeNull();
    }
  );

  it("clicking the Approve action invokes onApprove exactly once", async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    renderTopBar({ onApprove, hasAnnotations: false });
    await user.click(screen.getByTestId("top-bar-approve"));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it("clicking the settings button mounts the settings dialog (initially absent)", async () => {
    const user = userEvent.setup();
    renderTopBar({});
    expect(screen.queryByTestId("settings-dialog")).toBeNull();
    await user.click(screen.getByTestId("top-bar-settings"));
    expect(screen.queryByTestId("settings-dialog")).not.toBeNull();
  });
});
