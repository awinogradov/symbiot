import { useEffect, useState, type ReactNode } from "react";

type ResolvedTheme = "light" | "dark";
export type Theme = "system" | ResolvedTheme;

const resolveTheme = (theme: Theme): ResolvedTheme => {
  if (theme !== "system") return theme;
  return globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const applyTheme = (resolved: ResolvedTheme): void => {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
};

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

/**
 * Minimal `system | light | dark` theme provider. Phase 7 adds persistence,
 * settings UI, FOUC mitigation, and the inline pre-paint script.
 */
export const ThemeProvider = ({
  children,
  defaultTheme = "system",
}: ThemeProviderProps): React.ReactElement => {
  const [theme] = useState<Theme>(defaultTheme);

  useEffect(() => {
    applyTheme(resolveTheme(theme));
    if (theme !== "system") return;
    const media = globalThis.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (): void => applyTheme(resolveTheme("system"));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  return <>{children}</>;
};
