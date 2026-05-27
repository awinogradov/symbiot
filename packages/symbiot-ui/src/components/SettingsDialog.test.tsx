// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SettingsDialog } from "./SettingsDialog.tsx";
import { ThemeProvider, useTheme } from "./ThemeProvider.tsx";

const Probe = ({ onTheme }: { onTheme: (t: string) => void }): React.ReactElement => {
  const { theme } = useTheme();
  onTheme(theme);
  return <span data-testid="probe">{theme}</span>;
};

const Wrapper = (props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  spy: (t: string) => void;
}) => (
  <ThemeProvider defaultTheme="system">
    <Probe onTheme={props.spy} />
    <SettingsDialog open={props.open} onOpenChange={props.onOpenChange} />
  </ThemeProvider>
);

describe("SettingsDialog", () => {
  it.each(["system", "light", "dark"] as const)(
    "clicking %s in the theme toggle propagates that value to setTheme via the provider",
    async (target) => {
      const user = userEvent.setup();
      const seen: string[] = [];
      render(<Wrapper open onOpenChange={vi.fn()} spy={(t) => seen.push(t)} />);
      await user.click(screen.getByTestId(`settings-theme-${target}`));
      expect(seen.at(-1)).toBe(target);
    }
  );

  it("renders no dialog node when open is false", () => {
    render(<Wrapper open={false} onOpenChange={vi.fn()} spy={() => {}} />);
    expect(screen.queryByTestId("settings-dialog")).toBeNull();
  });
});
