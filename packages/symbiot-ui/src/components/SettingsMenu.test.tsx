// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SettingsMenu } from "./SettingsMenu.tsx";
import { ThemeProvider, useTheme } from "./ThemeProvider.tsx";

const Probe = (): React.ReactElement => {
  const { theme } = useTheme();
  return <span data-testid="probe">{theme}</span>;
};

const renderMenu = () =>
  render(
    <ThemeProvider defaultTheme="system">
      <Probe />
      <SettingsMenu />
    </ThemeProvider>
  );

describe("SettingsMenu", () => {
  it("renders no menu content until the trigger is activated", () => {
    renderMenu();
    expect(screen.queryByTestId("settings-menu")).toBeNull();
  });

  // Keyboard-driven path on purpose: Radix menus rely on pointer events that
  // happy-dom implements only partially, so Enter-to-open + Arrow-to-select
  // is the deterministic route (it also covers the documented a11y contract).
  it("opening via keyboard and selecting Dark propagates the theme to the provider", async () => {
    const user = userEvent.setup();
    renderMenu();
    screen.getByTestId("top-bar-settings").focus();
    await user.keyboard("{Enter}");
    expect(screen.queryByTestId("settings-menu")).not.toBeNull();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(screen.getByTestId("probe").textContent).toBe("dark");
    expect(screen.queryByTestId("settings-menu")).toBeNull();
  });
});
