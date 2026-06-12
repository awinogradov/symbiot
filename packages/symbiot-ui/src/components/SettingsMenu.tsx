/**
 * Settings dropdown menu anchored to the top-bar settings button. Hosts the
 * System/Light/Dark theme selector as a menu radio group. Radix owns the open
 * state and the menu closes on selection — the undimmed document behind it
 * doubles as a live theme preview, so staying open buys nothing.
 */
import { Monitor, Moon, Settings, Sun } from "lucide-react";
import { useCallback, type ComponentType, type SVGProps } from "react";

import { Button } from "./Button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./DropdownMenu.tsx";
import { useTheme, type Theme } from "./ThemeProvider.tsx";

/** Renderable theme entry: persisted value + label + icon component. */
interface ThemeOption {
  value: Theme;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const themeOptions: readonly ThemeOption[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

const isThemeValue = (next: string): next is Theme =>
  themeOptions.some((option) => option.value === next);

export const SettingsMenu = (): React.ReactElement => {
  const { theme, setTheme } = useTheme();

  const onValueChange = useCallback(
    (next: string): void => {
      if (isThemeValue(next)) setTheme(next);
    },
    [setTheme]
  );

  // Non-modal: the default modal menu aria-hides the rest of the page while
  // leaving it focusable, which trips axe's aria-hidden-focus (serious) in
  // the a11y baseline. The document staying live behind the menu is also the
  // point of the dropdown — it doubles as a theme preview.
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          data-testid="top-bar-settings"
          variant="ghost"
          size="icon"
          aria-label="Settings"
          className="size-8"
        >
          <Settings />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent data-testid="settings-menu" align="end">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          aria-label="Color theme"
          value={theme}
          onValueChange={onValueChange}
        >
          {themeOptions.map(({ value, label, Icon }) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              data-testid={`settings-theme-${value}`}
            >
              <Icon />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
