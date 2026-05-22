/**
 * Locks every annotation token (`--anno-delete`, `--anno-insert`,
 * `--anno-replace`, `--anno-comment`) at WCAG AA (>= 4.5:1) against
 * `--background` in both light and dark themes. The test reads the actual
 * `theme.css` cascade through JSDOM by toggling the `.dark` class on
 * `document.documentElement`, so a hue tweak that drops below AA fails CI
 * before review.
 *
 * Methodology mirrors `docs/theming.md`: OKLCH → Oklab → linear sRGB (Björn
 * Ottosson reference matrix) → WCAG 2.1 relative luminance → contrast ratio.
 * The math is inlined rather than imported from `wcag-contrast` because that
 * library accepts only sRGB inputs — the OKLCH parser and Ottosson matrix
 * would still be hand-rolled, so collapsing both into ~40 lines of inline
 * math keeps the test a single, self-explanatory file with the formula
 * visible at the call site.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { JSDOM, type DOMWindow } from "jsdom";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

interface Oklch {
  l: number;
  c: number;
  h: number;
}

interface Oklab {
  l: number;
  a: number;
  b: number;
}

type LinearRgb = readonly [number, number, number];

const themeCss = await readTheme();
const injectableCss = stripUnparseableBlocks(themeCss);

const themes = ["light", "dark"] as const;
const tokens = ["--anno-delete", "--anno-insert", "--anno-replace", "--anno-comment"] as const;
const cases = themes.flatMap((theme) => tokens.map((token) => ({ theme, token })));

describe("theme.css annotation tokens", () => {
  let dom: JSDOM;
  let window: DOMWindow;

  beforeAll(() => {
    dom = new JSDOM(
      `<!DOCTYPE html><html><head><style>${injectableCss}</style></head><body></body></html>`
    );
    ({ window } = dom);
  });

  afterAll(() => {
    dom.window.close();
  });

  it.each(cases)("$theme: $token meets WCAG AA (>= 4.5:1) vs --background", ({ theme, token }) => {
    const root = window.document.documentElement;
    root.classList.toggle("dark", theme === "dark");

    const computed = window.getComputedStyle(root);
    const tokenRgb = linearRgbFromOklch(computed.getPropertyValue(token).trim());
    const backgroundRgb = linearRgbFromOklch(computed.getPropertyValue("--background").trim());

    const ratio = contrastRatio(luminance(tokenRgb), luminance(backgroundRgb));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe("parseOklch", () => {
  it("throws on unsupported OKLCH forms (percent L, alpha channel, named colors)", () => {
    expect(() => parseOklch("oklch(50% 0.2 25)")).toThrow(/Unsupported OKLCH/);
    expect(() => parseOklch("oklch(0.5 0.2 25 / 0.5)")).toThrow(/Unsupported OKLCH/);
    expect(() => parseOklch("red")).toThrow(/Unsupported OKLCH/);
  });
});

async function readTheme(): Promise<string> {
  try {
    return await readFile(join(import.meta.dirname, "theme.css"), "utf8");
  } catch (cause) {
    throw new Error("Failed to read theme.css", { cause });
  }
}

function stripUnparseableBlocks(css: string): string {
  const withoutImports = css.replace(/^\s*@import\b[^;]*;\s*$/gm, "");
  return stripAtThemeBlocks(withoutImports);
}

function stripAtThemeBlocks(css: string): string {
  let out = css;
  while (true) {
    const start = out.search(/@theme\s+inline\s*\{/);
    if (start === -1) {
      return out;
    }
    const openBrace = out.indexOf("{", start);
    if (openBrace === -1) {
      return out;
    }
    const end = findMatchingBrace(out, openBrace);
    if (end === -1) {
      return out;
    }
    out = `${out.slice(0, start)}${out.slice(end + 1)}`;
  }
}

function findMatchingBrace(source: string, openIndex: number): number {
  let depth = 1;
  let i = openIndex + 1;
  while (i < source.length && depth > 0) {
    const ch = source.charAt(i);
    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
    }
    i += 1;
  }
  return depth === 0 ? i - 1 : -1;
}

function parseOklch(value: string): Oklch {
  const match = /^oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)$/.exec(value);
  const lRaw = match?.[1];
  const cRaw = match?.[2];
  const hRaw = match?.[3];
  if (lRaw === undefined || cRaw === undefined || hRaw === undefined) {
    throw new Error(`Unsupported OKLCH form: ${value}`);
  }
  return { l: Number(lRaw), c: Number(cRaw), h: Number(hRaw) };
}

function oklchToOklab({ l, c, h }: Oklch): Oklab {
  const rad = (h * Math.PI) / 180;
  return { l, a: c * Math.cos(rad), b: c * Math.sin(rad) };
}

function oklabToLinearSrgb({ l, a, b }: Oklab): LinearRgb {
  const lCubeRoot = l + 0.3963377774 * a + 0.2158037573 * b;
  const mCubeRoot = l - 0.1055613458 * a - 0.0638541728 * b;
  const sCubeRoot = l - 0.0894841775 * a - 1.291485548 * b;

  const lLong = lCubeRoot ** 3;
  const mLong = mCubeRoot ** 3;
  const sLong = sCubeRoot ** 3;

  return [
    4.0767416621 * lLong - 3.3077115913 * mLong + 0.2309699292 * sLong,
    -1.2684380046 * lLong + 2.6097574011 * mLong - 0.3413193965 * sLong,
    -0.0041960863 * lLong - 0.7034186147 * mLong + 1.707614701 * sLong,
  ];
}

function linearRgbFromOklch(value: string): LinearRgb {
  return oklabToLinearSrgb(oklchToOklab(parseOklch(value)));
}

function luminance([r, g, b]: LinearRgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
