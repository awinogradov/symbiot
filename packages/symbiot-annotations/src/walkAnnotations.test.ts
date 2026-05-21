import { describe, expect, it } from "vitest";

import type { PlateValue } from "./types.ts";
import { onlyComments, onlyDeletions, onlyGlobals, walkAnnotations } from "./walkAnnotations.ts";

describe("walkAnnotations", () => {
  it("extracts comments, deletions, and global comments in one pass", () => {
    const value: PlateValue = [
      {
        type: "p",
        children: [
          { text: "keep " },
          { text: "this", comment: true, comment_c1: true },
          { text: " and " },
          { text: "drop", suggestion: true, suggestion_d1: true },
          { text: " this" },
        ],
      },
    ];
    const entries = walkAnnotations({
      value,
      commentBodies: new Map([["c1", "rename it"]]),
      globalComments: [{ id: "g1", body: "good direction" }],
    });

    expect(onlyComments(entries)).toEqual([{ id: "c1", originalText: "this", body: "rename it" }]);
    expect(onlyDeletions(entries)).toEqual([{ id: "d1", originalText: "drop" }]);
    expect(onlyGlobals(entries)).toEqual([{ id: "g1", body: "good direction" }]);
  });

  it("ignores comments without a body but always emits deletions", () => {
    const value: PlateValue = [
      {
        type: "p",
        children: [
          { text: "a", comment: true, comment_x: true },
          { text: "b", suggestion: true, suggestion_y: true },
        ],
      },
    ];
    const entries = walkAnnotations({
      value,
      commentBodies: new Map(),
      globalComments: [],
    });
    expect(onlyComments(entries)).toEqual([]);
    expect(onlyDeletions(entries)).toEqual([{ id: "y", originalText: "b" }]);
  });
});

describe("walkAnnotations drift detection", () => {
  it("emits no `drifted` field when no sidecar map is supplied (back-compat)", () => {
    const value: PlateValue = [
      {
        type: "p",
        children: [{ text: "anchor", comment: true, comment_c1: true }],
      },
    ];
    const [entry] = onlyComments(
      walkAnnotations({
        value,
        commentBodies: new Map([["c1", "body"]]),
        globalComments: [],
      })
    );
    expect(entry?.drifted).toBeUndefined();
  });

  it("does not mark drift when stored text matches the live fragment", () => {
    const value: PlateValue = [
      {
        type: "p",
        children: [{ text: "anchor", comment: true, comment_c1: true }],
      },
    ];
    const [entry] = onlyComments(
      walkAnnotations({
        value,
        commentBodies: new Map([["c1", "body"]]),
        commentOriginalTexts: new Map([["c1", "anchor"]]),
        globalComments: [],
      })
    );
    expect(entry?.drifted).toBeUndefined();
    expect(entry?.originalText).toBe("anchor");
  });

  it("does not mark drift when stored text re-locates via text-quote fallback", () => {
    const value: PlateValue = [
      { type: "p", children: [{ text: "lead" }] },
      {
        type: "p",
        children: [{ text: "moved-anchor", comment: true, comment_c1: true }],
      },
    ];
    const [entry] = onlyComments(
      walkAnnotations({
        value,
        commentBodies: new Map([["c1", "body"]]),
        commentOriginalTexts: new Map([["c1", "moved-anchor"]]),
        globalComments: [],
      })
    );
    expect(entry?.drifted).toBeUndefined();
    expect(entry?.originalText).toBe("moved-anchor");
  });

  it("marks drift when stored text is absent from the live value", () => {
    const value: PlateValue = [
      {
        type: "p",
        children: [{ text: "garbled", comment: true, comment_c1: true }],
      },
    ];
    const [entry] = onlyComments(
      walkAnnotations({
        value,
        commentBodies: new Map([["c1", "body"]]),
        commentOriginalTexts: new Map([["c1", "deleted-anchor"]]),
        globalComments: [],
      })
    );
    expect(entry?.drifted).toBe(true);
    expect(entry?.originalText).toBe("deleted-anchor");
  });

  it("marks drift on deletions whose stored text is gone", () => {
    const value: PlateValue = [
      {
        type: "p",
        children: [{ text: "garbled", suggestion: true, suggestion_d1: true }],
      },
    ];
    const [entry] = onlyDeletions(
      walkAnnotations({
        value,
        commentBodies: new Map(),
        suggestionOriginalTexts: new Map([["d1", "deleted-anchor"]]),
        globalComments: [],
      })
    );
    expect(entry?.drifted).toBe(true);
    expect(entry?.originalText).toBe("deleted-anchor");
  });
});
