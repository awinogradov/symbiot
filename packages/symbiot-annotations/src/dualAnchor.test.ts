import { describe, expect, it } from "vitest";

import { resolveAnchor, type DualAnchor } from "./dualAnchor.ts";
import type { PlateValue } from "./types.ts";

const docWith = (paragraphs: string[]): PlateValue =>
  paragraphs.map((text) => ({ type: "p", children: [{ text }] }));

describe("resolveAnchor", () => {
  it("resolves via path when the path still addresses the original text", () => {
    const value: PlateValue = docWith(["one", "two", "three"]);
    const anchor: DualAnchor = { pathAnchor: [1], originalText: "two" };
    expect(resolveAnchor(value, anchor)).toEqual({
      strategy: "path",
      pathAnchor: [1],
      text: "two",
    });
  });

  it("falls back to text-quote when the path has shifted", () => {
    const value: PlateValue = docWith(["one", "extra inserted block", "two", "three"]);
    const anchor: DualAnchor = { pathAnchor: [1], originalText: "two" };
    expect(resolveAnchor(value, anchor)).toEqual({
      strategy: "text-quote",
      pathAnchor: [2],
      text: "two",
    });
  });

  it("returns missing when the original text has been edited away", () => {
    const value: PlateValue = docWith(["one", "three"]);
    const anchor: DualAnchor = { pathAnchor: [1], originalText: "two" };
    expect(resolveAnchor(value, anchor)).toEqual({ strategy: "missing" });
  });
});
