// @vitest-environment happy-dom
import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ThemeProvider, useTheme, themeStorageKey } from "./ThemeProvider.tsx";

const wrapperWithDefault = (defaultTheme: "system" | "light" | "dark") =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <ThemeProvider defaultTheme={defaultTheme}>{children}</ThemeProvider>;
  };

describe("ThemeProvider render path", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.style.colorScheme = "";
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("provides the default theme to useTheme when no value is stored", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: wrapperWithDefault("light"),
    });
    expect(result.current.theme).toBe("light");
  });

  it("applies the dark class on <html> when theme resolves to dark", () => {
    renderHook(() => useTheme(), { wrapper: wrapperWithDefault("dark") });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("setTheme(dark) flips the html class and persists to localStorage", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: wrapperWithDefault("light"),
    });
    act(() => {
      result.current.setTheme("dark");
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem(themeStorageKey)).toBe("dark");
  });

  it("setTheme(system) removes the stored value", () => {
    localStorage.setItem(themeStorageKey, "dark");
    const { result } = renderHook(() => useTheme(), {
      wrapper: wrapperWithDefault("system"),
    });
    act(() => {
      result.current.setTheme("system");
    });
    expect(localStorage.getItem(themeStorageKey)).toBeNull();
  });

  it("useTheme throws when used outside a ThemeProvider", () => {
    expect(() => renderHook(() => useTheme())).toThrow(/within a ThemeProvider/);
  });

  it("renders its children", () => {
    const { container } = render(
      <ThemeProvider defaultTheme="light">
        <span data-testid="child">x</span>
      </ThemeProvider>
    );
    expect(container.querySelector('[data-testid="child"]')?.textContent).toBe("x");
  });
});
