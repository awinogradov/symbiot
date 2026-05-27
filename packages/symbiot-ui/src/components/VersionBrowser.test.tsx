// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { VersionBrowser } from "./VersionBrowser.tsx";

describe("VersionBrowser", () => {
  it("renders the empty-state hint and omits the list when no versions exist", () => {
    render(<VersionBrowser versions={[]} active={0} onSelect={vi.fn()} />);
    expect(screen.queryByTestId("version-browser-empty")).not.toBeNull();
    expect(screen.queryByTestId("version-browser")).toBeNull();
  });

  it("renders versions in descending order with a stable test-id", () => {
    render(<VersionBrowser versions={[1, 2, 3]} active={2} onSelect={vi.fn()} />);
    const list = screen.getByTestId("version-browser");
    const rows = list.querySelectorAll("[data-testid^=version-row-]");
    expect(rows).toHaveLength(3);
    expect(rows.item(0)?.getAttribute("data-testid")).toBe("version-row-3");
    expect(rows.item(2)?.getAttribute("data-testid")).toBe("version-row-1");
  });

  it("emits onSelect with the clicked version", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<VersionBrowser versions={[1, 2]} active={2} onSelect={onSelect} />);
    await user.click(screen.getByTestId("version-row-1"));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("renders the 'current' badge only on the active row", () => {
    render(<VersionBrowser versions={[1, 2]} active={2} onSelect={vi.fn()} />);
    const row2 = screen.getByTestId("version-row-2");
    const row1 = screen.getByTestId("version-row-1");
    expect(row2.textContent).toContain("current");
    expect(row1.textContent).not.toContain("current");
  });
});
