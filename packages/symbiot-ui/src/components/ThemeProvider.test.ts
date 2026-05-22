import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isTheme,
  readStoredTheme,
  themeStorageKey,
  themes,
  writeStoredTheme,
  type Theme,
} from "./ThemeProvider.tsx";

interface LocalStorageMock {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

const createStorageMock = (): LocalStorageMock => {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
};

describe("isTheme", () => {
  it("returns true for each valid Theme literal", () => {
    for (const theme of themes) {
      expect(isTheme(theme)).toBe(true);
    }
  });

  it("returns false for non-theme strings, non-strings, and nullish input", () => {
    expect(isTheme("chartreuse")).toBe(false);
    expect(isTheme("")).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(undefined)).toBe(false);
    expect(isTheme(42)).toBe(false);
  });
});

describe("readStoredTheme", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when no value is stored", () => {
    expect(readStoredTheme()).toBeNull();
  });

  it("returns each valid Theme when persisted", () => {
    for (const theme of themes) {
      localStorage.setItem(themeStorageKey, theme);
      expect(readStoredTheme()).toBe(theme);
    }
  });

  it("returns null when the stored value is not a valid Theme", () => {
    localStorage.setItem(themeStorageKey, "chartreuse");
    expect(readStoredTheme()).toBeNull();
  });

  it("returns null when localStorage is undefined (SSR guard)", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readStoredTheme()).toBeNull();
  });
});

describe("writeStoredTheme", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(["light", "dark"] as const satisfies readonly Theme[])(
    "writes the literal %s value to localStorage",
    (theme) => {
      writeStoredTheme(theme);
      expect(localStorage.getItem(themeStorageKey)).toBe(theme);
    }
  );

  it("removes the key when called with system (system is never persisted)", () => {
    localStorage.setItem(themeStorageKey, "dark");
    writeStoredTheme("system");
    expect(localStorage.getItem(themeStorageKey)).toBeNull();
  });

  it("is a no-op when localStorage is undefined (SSR guard)", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(() => writeStoredTheme("dark")).not.toThrow();
  });
});
