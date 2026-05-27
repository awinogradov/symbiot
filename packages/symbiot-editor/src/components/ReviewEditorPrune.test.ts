import { describe, expect, it } from "vitest";

import { emptyMaps, stubEditor, stubSetters } from "./_reviewEditorTestHelpers.ts";
import { pruneRemovedAnnotation, snapshotOf } from "./ReviewEditorPrune.tsx";
import type { AnnotationHandleKind } from "./ReviewEditorTypes.tsx";

interface PerKindCase {
  kind: AnnotationHandleKind;
  /** Build a non-empty `AnnotationMaps` snapshot that contains the id under this kind's tracked fields. */
  withEntry: (id: string) => Parameters<typeof pruneRemovedAnnotation>[2];
  /** Setters that this kind is expected to invoke when the id existed. */
  setterKeys: (keyof ReturnType<typeof stubSetters>)[];
  /** Map fields on the returned `AnnotationMaps` that should no longer contain the id. */
  fieldKeys: (keyof Parameters<typeof pruneRemovedAnnotation>[2])[];
}

const cases: PerKindCase[] = [
  {
    kind: "comment",
    withEntry: (id) => ({
      ...emptyMaps(),
      bodies: new Map([[id, "body"]]),
      images: new Map([[id, ["x.png"]]]),
      commentOriginalTexts: new Map([[id, "anchor"]]),
    }),
    setterKeys: ["setBodies", "setImages", "setCommentOriginalTexts"],
    fieldKeys: ["bodies", "images", "commentOriginalTexts"],
  },
  {
    kind: "deletion",
    withEntry: (id) => ({
      ...emptyMaps(),
      suggestionOriginalTexts: new Map([[id, "gone"]]),
    }),
    setterKeys: ["setSuggestionOriginalTexts"],
    fieldKeys: ["suggestionOriginalTexts"],
  },
  {
    kind: "insertion",
    withEntry: (id) => ({
      ...emptyMaps(),
      insertionNewTexts: new Map([[id, "new"]]),
      insertionImages: new Map([[id, ["a.png"]]]),
      insertionOriginalTexts: new Map([[id, "ctx"]]),
    }),
    setterKeys: ["setInsertionNewTexts", "setInsertionImages", "setInsertionOriginalTexts"],
    fieldKeys: ["insertionNewTexts", "insertionImages", "insertionOriginalTexts"],
  },
  {
    kind: "replacement",
    withEntry: (id) => ({
      ...emptyMaps(),
      replacementTexts: new Map([[id, "with"]]),
      replacementImages: new Map([[id, ["b.png"]]]),
      replacementOriginalTexts: new Map([[id, "old"]]),
    }),
    setterKeys: ["setReplacementTexts", "setReplacementImages", "setReplacementOriginalTexts"],
    fieldKeys: ["replacementTexts", "replacementImages", "replacementOriginalTexts"],
  },
];

describe("pruneRemovedAnnotation", () => {
  it.each(cases)(
    "$kind drops the id from every tracked map and invokes only the matching setters",
    ({ kind, withEntry, setterKeys, fieldKeys }) => {
      const setters = stubSetters();
      const next = pruneRemovedAnnotation(kind, "id1", withEntry("id1"), setters);
      for (const field of fieldKeys) expect(next[field].has("id1")).toBe(false);
      for (const setterKey of setterKeys) expect(setters[setterKey]).toHaveBeenCalledTimes(1);
      // No unrelated setter for the other kinds fires.
      const unrelated = (Object.keys(setters) as (keyof typeof setters)[]).filter(
        (k) => !setterKeys.includes(k)
      );
      for (const k of unrelated) expect(setters[k]).not.toHaveBeenCalled();
    }
  );

  it.each(cases)(
    "$kind is a no-op when the id is absent — setters do not fire and field map identity is preserved",
    ({ kind, setterKeys, fieldKeys }) => {
      const setters = stubSetters();
      const current = emptyMaps();
      const next = pruneRemovedAnnotation(kind, "missing", current, setters);
      for (const field of fieldKeys) expect(next[field]).toBe(current[field]);
      for (const setterKey of setterKeys) expect(setters[setterKey]).not.toHaveBeenCalled();
    }
  );
});

describe("snapshotOf", () => {
  it("aliases `value` to editor.children and clones every map so snapshot mutations stay isolated", () => {
    const maps = emptyMaps();
    maps.bodies.set("c", "body");
    maps.suggestionOriginalTexts.set("d", "del-orig");
    maps.insertionNewTexts.set("i", "new");
    maps.replacementOriginalTexts.set("r", "old");
    const editorChildren = [{ type: "p", children: [{ text: "hi" }] }];
    const editor = stubEditor({ children: editorChildren });

    const snap = snapshotOf(editor, maps);
    expect(snap.value).toBe(editorChildren);

    snap.commentBodies.set("evil", "x");
    expect(maps.bodies.has("evil")).toBe(false);

    expect(snap.commentBodies.get("c")).toBe("body");
    expect(snap.suggestionOriginalTexts.get("d")).toBe("del-orig");
    expect(snap.insertionNewTexts.get("i")).toBe("new");
    expect(snap.replacementOriginalTexts.get("r")).toBe("old");
  });
});
