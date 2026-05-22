import { afterEach, describe, expect, it, vi } from "vitest";

import { formatHotkey } from "./Kbd.tsx";

const stubUserAgent = (ua: string): void => {
  vi.stubGlobal("navigator", { userAgent: ua });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("formatHotkey", () => {
  it("renders mod as ⌘ on Mac user agents", () => {
    stubUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
    expect(formatHotkey("mod+enter")).toBe("⌘ ↵");
  });

  it("renders mod as Ctrl on non-Mac user agents", () => {
    stubUserAgent("Mozilla/5.0 (X11; Linux x86_64)");
    expect(formatHotkey("mod+enter")).toBe("Ctrl ↵");
  });

  it("uppercases single-letter keys", () => {
    stubUserAgent("Mozilla/5.0 (X11; Linux x86_64)");
    expect(formatHotkey("c")).toBe("C");
  });

  it("maps named keys to symbols", () => {
    stubUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
    expect(formatHotkey("shift+escape")).toBe("⇧ Esc");
  });
});
