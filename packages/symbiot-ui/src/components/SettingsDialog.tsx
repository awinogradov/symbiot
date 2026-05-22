/**
 * Settings dialog with a Theme section. Controlled via `open` + `onOpenChange`
 * (mirrors `AnnotationComposer`). The layout reserves room for future
 * settings sections (e.g. author name) so they can drop in without restructuring.
 */
import { Monitor, Moon, Sun } from "lucide-react";
import { useCallback, type ComponentType, type SVGProps } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./Dialog.tsx";
import { useTheme, type Theme } from "./ThemeProvider.tsx";
import { ToggleGroup, ToggleGroupItem } from "./ToggleGroup.tsx";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

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

const ThemeToggle = (): React.ReactElement => {
  const { theme, setTheme } = useTheme();

  // Radix emits an empty string when the active item is clicked again
  // (deselection). The toggle must remain "single, required" — ignore.
  const onValueChange = useCallback(
    (next: string): void => {
      if (next === "") return;
      setTheme(next as Theme);
    },
    [setTheme]
  );

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Theme</span>
      <ToggleGroup
        type="single"
        value={theme}
        onValueChange={onValueChange}
        variant="outline"
        aria-label="Color theme"
      >
        {themeOptions.map(({ value, label, Icon }) => (
          <ToggleGroupItem
            key={value}
            value={value}
            aria-label={label}
            data-testid={`settings-theme-${value}`}
          >
            <Icon />
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps): React.ReactElement => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent data-testid="settings-dialog" className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription className="sr-only">Configure application preferences</DialogDescription>
      </DialogHeader>
      <ThemeToggle />
    </DialogContent>
  </Dialog>
);
