/**
 * Theme provider with persistence and a `useTheme` hook.
 *
 * Resolves `system | light | dark`, listens for OS `prefers-color-scheme`
 * changes when in `system` mode, and persists the user's explicit choice
 * under `localStorage["symbiot.theme"]`. `"system"` is never persisted —
 * choosing it clears the key, so the next mount falls back to `defaultTheme`.
 *
 * First-frame FOUC is documented at the `useEffect` apply site; eliminating
 * it requires an inline pre-paint script that sets `.dark` before render.
 */
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Theme values exposed to consumers. `"system"` follows the OS preference and is never persisted. */
export const themes = ["system", "light", "dark"] as const;

/**
 * localStorage key for the user's explicit theme choice.
 *
 * camelCase is intentional per project convention (CLAUDE.md §4) — do not
 * "fix" this to SCREAMING_SNAKE.
 */
export const themeStorageKey = "symbiot.theme";

type ResolvedTheme = "light" | "dark";
export type Theme = (typeof themes)[number];

/**
 * Narrow an unknown value (e.g. a raw `localStorage` read) to {@link Theme}.
 *
 * @example
 * const raw: unknown = localStorage.getItem(themeStorageKey);
 * if (isTheme(raw)) setTheme(raw);
 */
export const isTheme = (value: unknown): value is Theme =>
  typeof value === "string" && (themes as readonly string[]).includes(value);

/**
 * Read the persisted theme. Returns `null` when no choice is stored, the
 * stored value is invalid, or `localStorage` is unavailable (SSR / tests
 * without DOM globals).
 */
export const readStoredTheme = (): Theme | null => {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(themeStorageKey);
  return isTheme(raw) ? raw : null;
};

/**
 * Write the user's explicit theme choice. Passing `"system"` removes the
 * key so the next mount falls back to the provider's `defaultTheme`.
 * No-op when `localStorage` is unavailable.
 */
export const writeStoredTheme = (theme: Theme): void => {
  if (typeof localStorage === "undefined") return;
  if (theme === "system") {
    localStorage.removeItem(themeStorageKey);
    return;
  }
  localStorage.setItem(themeStorageKey, theme);
};

const resolveTheme = (theme: Theme): ResolvedTheme => {
  if (theme !== "system") return theme;
  return globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const applyTheme = (resolved: ResolvedTheme): void => {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
};

/** Value exposed by {@link useTheme}. */
export interface ThemeContextValue {
  theme: Theme;
  setTheme: (next: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Read the current theme and setter from the nearest {@link ThemeProvider}.
 * Throws when used outside a provider.
 *
 * @example
 * const { theme, setTheme } = useTheme();
 * <button onClick={() => setTheme("dark")}>Dark</button>
 */
export const useTheme = (): ThemeContextValue => {
  const ctx = use(ThemeContext);
  if (ctx === null) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
};

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

/**
 * Context provider that resolves `system | light | dark`, applies the
 * `.dark` class on `<html>`, and persists explicit user choice to
 * `localStorage[themeStorageKey]`. Wrap the app once near the root.
 *
 * @example
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 */
export const ThemeProvider = ({
  children,
  defaultTheme = "system",
}: ThemeProviderProps): React.ReactElement => {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme() ?? defaultTheme);

  const updateTheme = useCallback((next: Theme): void => {
    writeStoredTheme(next);
    setTheme(next);
  }, []);

  // FOUC on initial mount is intentional — eliminating it requires an
  // inline pre-paint script that sets `.dark` before first render.
  useEffect(() => {
    applyTheme(resolveTheme(theme));
    if (theme !== "system") return;
    const media = globalThis.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (): void => applyTheme(resolveTheme("system"));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme: updateTheme }),
    [theme, updateTheme]
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
};
