import { describe, expect, it } from "vitest";

import type { PlateValue } from "./types.ts";
import {
  onlyComments,
  onlyDeletions,
  onlyGlobals,
  onlyInsertions,
  onlyReplacements,
  onlyTasks,
  walkAnnotations,
} from "./walkAnnotations.ts";

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

describe("walkAnnotations insertions + replacements", () => {
  it("extracts insertion entries from `insertion_<id>` marks plus sidecar new texts", () => {
    const value: PlateValue = [
      {
        type: "p",
        children: [
          { text: "lead " },
          { text: "the quick brown fox", insertion_i1: true },
          { text: " trail" },
        ],
      },
    ];
    const entries = walkAnnotations({
      value,
      commentBodies: new Map(),
      globalComments: [],
      insertionNewTexts: new Map([["i1", "jumps"]]),
    });
    expect(onlyInsertions(entries)).toEqual([
      { id: "i1", contextText: "the quick brown fox", newText: "jumps" },
    ]);
  });

  it("extracts replacement entries from `replacement_<id>` marks plus sidecar replacement texts", () => {
    const value: PlateValue = [
      {
        type: "p",
        children: [
          { text: "before " },
          { text: "redundant clause", replacement_r1: true },
          { text: " after" },
        ],
      },
    ];
    const entries = walkAnnotations({
      value,
      commentBodies: new Map(),
      globalComments: [],
      replacementTexts: new Map([["r1", "concise note"]]),
    });
    expect(onlyReplacements(entries)).toEqual([
      { id: "r1", originalText: "redundant clause", replacementText: "concise note" },
    ]);
  });

  it("extracts task toggles from `task_<id>` marks, reading checked from the block", () => {
    const value: PlateValue = [
      {
        type: "p",
        listStyleType: "todo",
        checked: true,
        children: [{ text: "Open task", task_t1: true }],
      },
    ];
    const entries = walkAnnotations({ value, commentBodies: new Map(), globalComments: [] });
    expect(onlyTasks(entries)).toEqual([{ id: "t1", originalText: "Open task", checked: true }]);
  });

  it("skips `task_` marks on a block without a boolean checked state", () => {
    const value: PlateValue = [{ type: "p", children: [{ text: "not a task", task_t1: true }] }];
    const entries = walkAnnotations({ value, commentBodies: new Map(), globalComments: [] });
    expect(onlyTasks(entries)).toEqual([]);
  });

  it("skips insertion / replacement marks when sidecar text is missing", () => {
    const value: PlateValue = [
      {
        type: "p",
        children: [
          { text: "ctx", insertion_i1: true },
          { text: " " },
          { text: "orig", replacement_r1: true },
        ],
      },
    ];
    const entries = walkAnnotations({
      value,
      commentBodies: new Map(),
      globalComments: [],
      insertionNewTexts: new Map(),
      replacementTexts: new Map(),
    });
    expect(onlyInsertions(entries)).toEqual([]);
    expect(onlyReplacements(entries)).toEqual([]);
  });

  it("attaches image attachments via parallel sidecar maps", () => {
    const value: PlateValue = [
      {
        type: "p",
        children: [
          { text: "ctx", insertion_i1: true },
          { text: " " },
          { text: "orig", replacement_r1: true },
        ],
      },
    ];
    const entries = walkAnnotations({
      value,
      commentBodies: new Map(),
      globalComments: [],
      insertionNewTexts: new Map([["i1", "n"]]),
      insertionImages: new Map([["i1", ["img-i"]]]),
      replacementTexts: new Map([["r1", "r"]]),
      replacementImages: new Map([["r1", ["img-r"]]]),
    });
    expect(onlyInsertions(entries)[0]?.images).toEqual(["img-i"]);
    expect(onlyReplacements(entries)[0]?.images).toEqual(["img-r"]);
  });

  it("marks drift on insertions whose stored contextText is gone", () => {
    const value: PlateValue = [
      {
        type: "p",
        children: [{ text: "garbled", insertion_i1: true }],
      },
    ];
    const [entry] = onlyInsertions(
      walkAnnotations({
        value,
        commentBodies: new Map(),
        globalComments: [],
        insertionNewTexts: new Map([["i1", "n"]]),
        insertionOriginalTexts: new Map([["i1", "deleted-context"]]),
      })
    );
    expect(entry?.drifted).toBe(true);
    expect(entry?.contextText).toBe("deleted-context");
  });

  it("marks drift on replacements whose stored originalText is gone", () => {
    const value: PlateValue = [
      {
        type: "p",
        children: [{ text: "garbled", replacement_r1: true }],
      },
    ];
    const [entry] = onlyReplacements(
      walkAnnotations({
        value,
        commentBodies: new Map(),
        globalComments: [],
        replacementTexts: new Map([["r1", "r"]]),
        replacementOriginalTexts: new Map([["r1", "deleted-original"]]),
      })
    );
    expect(entry?.drifted).toBe(true);
    expect(entry?.originalText).toBe("deleted-original");
  });

  it("is a no-op on insertion / replacement marks when their sidecar maps are absent", () => {
    const value: PlateValue = [
      {
        type: "p",
        children: [
          { text: "ctx", insertion_i1: true },
          { text: "orig", replacement_r1: true },
        ],
      },
    ];
    const entries = walkAnnotations({
      value,
      commentBodies: new Map(),
      globalComments: [],
    });
    expect(onlyInsertions(entries)).toEqual([]);
    expect(onlyReplacements(entries)).toEqual([]);
    expect(onlyGlobals(entries)).toEqual([]);
  });
});

describe("walkAnnotations block-lines + multi-leaf", () => {
  it("attaches lines when the top-level block is stamped with __symbiotBlockLines", () => {
    const value: PlateValue = [
      {
        type: "p",
        __symbiotBlockLines: { startLine: 10, endLine: 12 },
        children: [{ text: "hello", comment: true, comment_c1: true }],
      },
    ];
    const [entry] = onlyComments(
      walkAnnotations({
        value,
        commentBodies: new Map([["c1", "b"]]),
        globalComments: [],
      })
    );
    expect(entry?.lines).toEqual({ startLine: 10, endLine: 12 });
  });

  it("ignores malformed __symbiotBlockLines values", () => {
    const value: PlateValue = [
      {
        type: "p",
        __symbiotBlockLines: { startLine: "x", endLine: 12 },
        children: [{ text: "hello", comment: true, comment_c1: true }],
      },
    ];
    const [entry] = onlyComments(
      walkAnnotations({
        value,
        commentBodies: new Map([["c1", "b"]]),
        globalComments: [],
      })
    );
    expect(entry?.lines).toBeUndefined();
  });

  it("recurses into nested children to find anchored leaves", () => {
    const value: PlateValue = [
      {
        type: "p",
        children: [
          { type: "span", children: [{ text: "nested", comment: true, comment_c1: true }] },
        ],
      },
    ];
    const [entry] = onlyComments(
      walkAnnotations({
        value,
        commentBodies: new Map([["c1", "b"]]),
        globalComments: [],
      })
    );
    expect(entry?.originalText).toBe("nested");
  });

  it("merges contiguous leaves sharing the same comment id and picks the earliest lines", () => {
    const value: PlateValue = [
      {
        type: "p",
        __symbiotBlockLines: { startLine: 5, endLine: 5 },
        children: [
          { text: "part-a", comment: true, comment_c1: true },
          { text: "part-b", comment: true, comment_c1: true },
        ],
      },
      {
        type: "p",
        __symbiotBlockLines: { startLine: 1, endLine: 1 },
        children: [{ text: "later", comment: true, comment_c1: true }],
      },
    ];
    const [entry] = onlyComments(
      walkAnnotations({
        value,
        commentBodies: new Map([["c1", "b"]]),
        globalComments: [],
      })
    );
    expect(entry?.originalText).toBe("part-apart-blater");
    expect(entry?.lines).toEqual({ startLine: 1, endLine: 1 });
  });
});
