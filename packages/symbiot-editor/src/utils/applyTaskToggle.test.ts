import { createSlateEditor } from "platejs";
import { describe, expect, it } from "vitest";

import { applyTaskToggle, removeTaskToggle } from "./applyTaskToggle.ts";
import { SymbiotEditorKit } from "./kit.ts";

type Node = Record<string, unknown> & { children?: Node[] };

const asNode = (value: unknown): Node => value as Node;

const createEditor = (
  value: NonNullable<Parameters<typeof createSlateEditor>[0]>["value"]
): ReturnType<typeof createSlateEditor> => createSlateEditor({ plugins: SymbiotEditorKit, value });

const firstItem = (editor: ReturnType<typeof createSlateEditor>): Node =>
  asNode(editor.children[0]);

const firstLeaf = (editor: ReturnType<typeof createSlateEditor>): Node =>
  asNode(firstItem(editor).children?.[0]);

/** Read back the `task_<id>` mark id a text leaf carries, mirroring the source. */
const taskMarkId = (leaf: Node): string | null => {
  const key = Object.keys(leaf).find((k) => k.startsWith("task_") && leaf[k] === true);
  return key === undefined ? null : key.slice("task_".length);
};

describe("applyTaskToggle", () => {
  it("checks the item and snapshots its original state on first toggle", () => {
    const editor = createEditor([{ type: "p", checked: false, children: [{ text: "task" }] }]);
    applyTaskToggle(editor, editor.children[0]);
    expect(firstItem(editor).checked).toBe(true);
    expect(firstItem(editor).taskOriginal).toBe(false);
    expect(firstLeaf(editor).task).toBe(true);
    expect(taskMarkId(firstLeaf(editor))).not.toBeNull();
  });

  it("removes the marks and feedback when toggled back to the original", () => {
    const editor = createEditor([{ type: "p", checked: false, children: [{ text: "task" }] }]);
    applyTaskToggle(editor, editor.children[0]);
    applyTaskToggle(editor, editor.children[0]);
    expect(firstItem(editor).checked).toBe(false);
    expect(firstItem(editor).taskOriginal).not.toBe(true);
    expect(firstLeaf(editor).task).toBeUndefined();
    expect(taskMarkId(firstLeaf(editor))).toBeNull();
  });

  it("only flips checked when a marked item already sits at its original state", () => {
    const editor = createEditor([
      {
        type: "p",
        checked: false,
        taskOriginal: false,
        children: [{ text: "task", task: true, task_abc: true }],
      },
    ]);
    applyTaskToggle(editor, editor.children[0]);
    expect(firstItem(editor).checked).toBe(true);
    expect(firstLeaf(editor).task).toBe(true);
    expect(taskMarkId(firstLeaf(editor))).toBe("abc");
  });

  it("ignores an element that is not in the editor tree", () => {
    const editor = createEditor([{ type: "p", checked: false, children: [{ text: "task" }] }]);
    applyTaskToggle(editor, { type: "p", checked: false, children: [{ text: "orphan" }] });
    expect(firstItem(editor).checked).toBe(false);
  });

  it("ignores a target that is a text leaf rather than an element", () => {
    const editor = createEditor([{ type: "p", checked: false, children: [{ text: "task" }] }]);
    applyTaskToggle(editor, firstItem(editor).children?.[0]);
    expect(firstItem(editor).checked).toBe(false);
  });
});

describe("removeTaskToggle", () => {
  it("drops the marks and restores the pre-toggle checked state", () => {
    const editor = createEditor([{ type: "p", checked: false, children: [{ text: "task" }] }]);
    applyTaskToggle(editor, editor.children[0]);
    const id = taskMarkId(firstLeaf(editor));
    expect(id).not.toBeNull();
    removeTaskToggle(editor, id as string);
    expect(firstItem(editor).checked).toBe(false);
    expect(firstItem(editor).taskOriginal).not.toBe(true);
    expect(firstLeaf(editor).task).toBeUndefined();
  });

  it("ignores a task id that no item carries", () => {
    const editor = createEditor([{ type: "p", checked: false, children: [{ text: "task" }] }]);
    removeTaskToggle(editor, "missing");
    expect(firstItem(editor).checked).toBe(false);
  });
});
