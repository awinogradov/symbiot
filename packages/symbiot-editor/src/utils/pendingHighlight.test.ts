import { createSlateEditor } from "platejs";
import { describe, expect, it, vi } from "vitest";

import {
  clearPendingHighlight,
  decoratePendingHighlight,
  setPendingHighlight,
} from "./pendingHighlight.ts";

const createEditor = (): ReturnType<typeof createSlateEditor> =>
  createSlateEditor({
    value: [
      { type: "p", children: [{ text: "hello world" }] },
      { type: "p", children: [{ text: "second block" }] },
    ],
  });

const textEntry = (editor: ReturnType<typeof createSlateEditor>, path: number[]) =>
  [editor.api.node(path)![0], path] as const;

describe("decoratePendingHighlight", () => {
  it("returns no ranges when nothing is pending", () => {
    const editor = createEditor();
    expect(decoratePendingHighlight(editor, [...textEntry(editor, [0, 0])])).toBeUndefined();
  });

  it("stamps the mark pair on the intersection with the pending range", () => {
    const editor = createEditor();
    setPendingHighlight(editor, {
      kind: "comment",
      id: "abc",
      range: { anchor: { path: [0, 0], offset: 0 }, focus: { path: [0, 0], offset: 5 } },
    });
    expect(decoratePendingHighlight(editor, [...textEntry(editor, [0, 0])])).toEqual([
      {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 5 },
        comment: true,
        comment_abc: true,
      },
    ]);
  });

  it("ignores element entries and text nodes outside the pending range", () => {
    const editor = createEditor();
    setPendingHighlight(editor, {
      kind: "insertion",
      id: "abc",
      range: { anchor: { path: [0, 0], offset: 0 }, focus: { path: [0, 0], offset: 5 } },
    });
    expect(decoratePendingHighlight(editor, [...textEntry(editor, [0])])).toBeUndefined();
    expect(decoratePendingHighlight(editor, [...textEntry(editor, [1, 0])])).toBeUndefined();
  });

  it("decorates each text node intersecting a multi-block range", () => {
    const editor = createEditor();
    setPendingHighlight(editor, {
      kind: "replacement",
      id: "abc",
      range: { anchor: { path: [0, 0], offset: 6 }, focus: { path: [1, 0], offset: 6 } },
    });
    expect(decoratePendingHighlight(editor, [...textEntry(editor, [0, 0])])).toEqual([
      {
        anchor: { path: [0, 0], offset: 6 },
        focus: { path: [0, 0], offset: 11 },
        replacement: true,
        replacement_abc: true,
      },
    ]);
    expect(decoratePendingHighlight(editor, [...textEntry(editor, [1, 0])])).toEqual([
      {
        anchor: { path: [1, 0], offset: 0 },
        focus: { path: [1, 0], offset: 6 },
        replacement: true,
        replacement_abc: true,
      },
    ]);
  });

  it("decorates a backward range like its forward equivalent", () => {
    const editor = createEditor();
    setPendingHighlight(editor, {
      kind: "comment",
      id: "abc",
      range: { anchor: { path: [0, 0], offset: 5 }, focus: { path: [0, 0], offset: 0 } },
    });
    expect(decoratePendingHighlight(editor, [...textEntry(editor, [0, 0])])).toEqual([
      {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 5 },
        comment: true,
        comment_abc: true,
      },
    ]);
  });

  it("skips collapsed intersections at hanging-range boundaries", () => {
    const editor = createEditor();
    setPendingHighlight(editor, {
      kind: "comment",
      id: "abc",
      range: { anchor: { path: [0, 0], offset: 0 }, focus: { path: [1, 0], offset: 0 } },
    });
    expect(decoratePendingHighlight(editor, [...textEntry(editor, [1, 0])])).toBeUndefined();
  });

  it("clamps a stale range to the entry's bounds instead of emitting an invalid range", () => {
    const editor = createEditor();
    setPendingHighlight(editor, {
      kind: "comment",
      id: "abc",
      range: { anchor: { path: [0, 0], offset: 4 }, focus: { path: [0, 0], offset: 99 } },
    });
    expect(decoratePendingHighlight(editor, [...textEntry(editor, [0, 0])])).toEqual([
      {
        anchor: { path: [0, 0], offset: 4 },
        focus: { path: [0, 0], offset: 11 },
        comment: true,
        comment_abc: true,
      },
    ]);
  });
});

describe("setPendingHighlight / clearPendingHighlight", () => {
  it("set and clear each trigger one redecorate", () => {
    const editor = createEditor();
    const redecorate = vi.spyOn(editor.api, "redecorate");
    setPendingHighlight(editor, {
      kind: "comment",
      id: "abc",
      range: { anchor: { path: [0, 0], offset: 0 }, focus: { path: [0, 0], offset: 5 } },
    });
    expect(redecorate).toHaveBeenCalledTimes(1);
    clearPendingHighlight(editor);
    expect(redecorate).toHaveBeenCalledTimes(2);
    expect(decoratePendingHighlight(editor, [...textEntry(editor, [0, 0])])).toBeUndefined();
  });

  it("clearing an editor with no pending entry is a redecorate-free no-op", () => {
    const editor = createEditor();
    const redecorate = vi.spyOn(editor.api, "redecorate");
    clearPendingHighlight(editor);
    expect(redecorate).not.toHaveBeenCalled();
  });
});
