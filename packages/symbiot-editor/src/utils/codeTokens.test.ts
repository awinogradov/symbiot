import { describe, expect, it } from "vitest";

import {
  type CodeToken,
  type CodeTokenSegment,
  lineTokensToSegments,
  segmentsToLeafRanges,
} from "./codeTokens.ts";

const token = (
  content: string,
  light: string | undefined,
  dark: string | undefined
): CodeToken => ({
  content,
  variants: { light: { color: light }, dark: { color: dark } },
});

describe("lineTokensToSegments", () => {
  it("accumulates offsets across tokens so segments tile the line", () => {
    const segments = lineTokensToSegments([
      token("const", "#cf222e", "#ff7b72"),
      token(" greeting", "#0550ae", "#79c0ff"),
    ]);
    expect(segments).toEqual([
      { start: 0, end: 5, light: "#cf222e", dark: "#ff7b72" },
      { start: 5, end: 14, light: "#0550ae", dark: "#79c0ff" },
    ]);
  });

  it("remaps the WCAG-AA-failing github-light orange on the light variant only", () => {
    const [segment] = lineTokensToSegments([token("type", "#e36209", "#ffa657")]);
    expect(segment).toEqual({ start: 0, end: 4, light: "#c2410c", dark: "#ffa657" });
  });

  it("drops zero-width tokens so no empty range reaches Slate", () => {
    const segments = lineTokensToSegments([
      token("", "#000000", "#ffffff"),
      token("x", "#cf222e", "#ff7b72"),
    ]);
    expect(segments).toEqual([{ start: 0, end: 1, light: "#cf222e", dark: "#ff7b72" }]);
  });

  it("keeps null colours when a token carries none (e.g. whitespace)", () => {
    const [segment] = lineTokensToSegments([token("  ", undefined, undefined)]);
    expect(segment).toEqual({ start: 0, end: 2, light: null, dark: null });
  });

  it("returns an empty array for an empty line", () => {
    expect(lineTokensToSegments([])).toEqual([]);
  });
});

const seg = (start: number, end: number, light = "#l", dark = "#d"): CodeTokenSegment => ({
  start,
  end,
  light,
  dark,
});

describe("segmentsToLeafRanges", () => {
  it("anchors each segment to the single leaf when the line is unsplit", () => {
    const ranges = segmentsToLeafRanges([seg(0, 5), seg(5, 9)], [9], [2, 0]);
    expect(ranges).toEqual([
      {
        anchor: { path: [2, 0, 0], offset: 0 },
        focus: { path: [2, 0, 0], offset: 5 },
        code_syntax: true,
        codeLight: "#l",
        codeDark: "#d",
      },
      {
        anchor: { path: [2, 0, 0], offset: 5 },
        focus: { path: [2, 0, 0], offset: 9 },
        code_syntax: true,
        codeLight: "#l",
        codeDark: "#d",
      },
    ]);
  });

  it("clips a token that straddles two leaves (annotation split) into per-leaf ranges", () => {
    // Line "abcdef" split by an annotation into leaves "abc" | "def".
    // A single syntax token covering offsets 1..5 must become two ranges.
    const ranges = segmentsToLeafRanges([seg(1, 5)], [3, 3], [0, 1]);
    expect(ranges).toEqual([
      {
        anchor: { path: [0, 1, 0], offset: 1 },
        focus: { path: [0, 1, 0], offset: 3 },
        code_syntax: true,
        codeLight: "#l",
        codeDark: "#d",
      },
      {
        anchor: { path: [0, 1, 1], offset: 0 },
        focus: { path: [0, 1, 1], offset: 2 },
        code_syntax: true,
        codeLight: "#l",
        codeDark: "#d",
      },
    ]);
  });

  it("emits nothing for a line with no segments", () => {
    expect(segmentsToLeafRanges([], [4], [0])).toEqual([]);
  });
});
