import { createSlateEditor } from "platejs";
import { describe, expect, it } from "vitest";

import { SymbiotEditorKit } from "./kit.ts";
import { removeTaskToggle } from "./removeTaskToggle.ts";

type Node = Record<string, unknown> & { children?: Node[] };

type EditorValue = NonNullable<Parameters<typeof createSlateEditor>[0]>["value"];

const asNode = (value: unknown): Node => value as Node;

const createEditor = (value: EditorValue): ReturnType<typeof createSlateEditor> =>
  createSlateEditor({ plugins: SymbiotEditorKit, value });

const firstItem = (editor: ReturnType<typeof createSlateEditor>): Node =>
  asNode(editor.children[0]);

const firstLeaf = (editor: ReturnType<typeof createSlateEditor>): Node =>
  asNode(firstItem(editor).children?.[0]);

/** Read back the `task_<id>` mark id a text leaf carries, mirroring the source. */
const taskMarkId = (leaf: Node): string | null => {
  const key = Object.keys(leaf).find((k) => k.startsWith("task_") && leaf[k] === true);
  return key === undefined ? null : key.slice("task_".length);
};

/**
 * A task toggle exactly as `applyTaskToggle` wrote it before #246 removed the
 * checkbox: `checked` flipped, `taskOriginal` snapshotting the pre-toggle state,
 * and the item's text tagged `task` + `task_<id>`.
 *
 * This literal is now the ONLY specification of that shape — `applyTaskToggle`
 * is gone, but drafts persisted by earlier builds are frozen in this format
 * (`useReviewState` saves the raw Plate value). Do not "tidy" a field away
 * because nothing writes it any more: drop `taskOriginal` or the bare `task`
 * mark here and `removeTaskToggle` will silently no-op against real saved
 * drafts while this test stays green.
 */
const legacyToggledDraft = (id: string): EditorValue => [
  {
    type: "p",
    listStyleType: "todo",
    checked: true,
    taskOriginal: false,
    children: [{ text: "task", task: true, [`task_${id}`]: true }],
  },
];

describe("removeTaskToggle", () => {
  it("drops the marks and restores the pre-toggle checked state", () => {
    const editor = createEditor(legacyToggledDraft("abc"));
    removeTaskToggle(editor, "abc");
    expect(firstItem(editor).checked).toBe(false);
    expect(firstItem(editor).taskOriginal).not.toBe(true);
    expect(firstLeaf(editor).task).toBeUndefined();
    expect(taskMarkId(firstLeaf(editor))).toBeNull();
  });

  it("restores a checked original rather than forcing the item open", () => {
    const editor = createEditor([
      {
        type: "p",
        listStyleType: "todo",
        checked: false,
        taskOriginal: true,
        children: [{ text: "task", task: true, task_abc: true }],
      },
    ]);
    removeTaskToggle(editor, "abc");
    expect(firstItem(editor).checked).toBe(true);
    expect(firstLeaf(editor).task).toBeUndefined();
  });

  it("ignores a task id that no item carries", () => {
    const editor = createEditor(legacyToggledDraft("abc"));
    removeTaskToggle(editor, "missing");
    expect(firstItem(editor).checked).toBe(true);
    expect(taskMarkId(firstLeaf(editor))).toBe("abc");
  });
});
