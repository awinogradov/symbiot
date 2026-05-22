import { MarkdownPlugin } from "@platejs/markdown";
import { useMemo } from "react";
import { Plate, PlateContent, createPlateEditor, usePlateEditor } from "platejs/react";
import type { PlateValue } from "@symbiot/annotations";

import { SymbiotDiffKit } from "../utils/kit.ts";
import { computeDiffValue, hasAnyDiff, pickChangedBlocks } from "../utils/diffPlugin.ts";

/** Visible diff view mode. `clean` drops untouched top-level blocks; `raw` keeps everything. */
export type DiffMode = "clean" | "raw";

interface DiffEditorProps {
  /** Markdown of the version selected in the History tab. */
  current: string;
  /** Markdown of the version immediately preceding `current`. */
  previous: string;
  /** Diff filter mode. `clean` (default in callers) drops unchanged blocks. */
  mode: DiffMode;
}

interface DiffBuild {
  /** Full diff value (every block from `current` with diff annotations). */
  full: PlateValue;
  /** Value to actually render given `mode` — `full` for Raw, filtered for Clean. */
  rendered: PlateValue;
  /** True when at least one block carries a diff operation. */
  hasChanges: boolean;
}

const buildDiff = (previous: string, current: string, mode: DiffMode): DiffBuild => {
  const editor = createPlateEditor({ plugins: SymbiotDiffKit });
  const md = editor.getApi(MarkdownPlugin).markdown;
  const prevValue = md.deserialize(previous) as PlateValue;
  const currValue = md.deserialize(current) as PlateValue;
  const full = computeDiffValue(prevValue, currValue, editor);
  const hasChanges = hasAnyDiff(full);
  const rendered = mode === "clean" ? pickChangedBlocks(full) : full;
  return { full, rendered, hasChanges };
};

/**
 * Read-only Plate editor that renders the inline diff between two markdown
 * versions. The transient `createPlateEditor` builds the diff value off the
 * render path; the live `usePlateEditor` renders that value through the same
 * `SymbiotDiffKit` so prose styling (tables, code blocks, lists) matches the
 * editable `ReviewEditor`. Re-keyed by `mode` so toggling Clean / Raw rebuilds
 * the editor state cleanly. When the two versions are byte-identical the diff
 * is empty — surface that explicitly so the reviewer isn't staring at a blank
 * pane wondering whether the renderer broke.
 */
export const DiffEditor = ({ current, previous, mode }: DiffEditorProps): React.ReactElement => {
  const diff = useMemo(() => buildDiff(previous, current, mode), [previous, current, mode]);
  // No deps on `usePlateEditor`: the parent (`DiffMount`) re-keys this
  // component on `mode` change, so the editor is freshly constructed with
  // the correct value baked in on every mount.
  const editor = usePlateEditor({
    plugins: SymbiotDiffKit,
    value: diff.rendered as never,
  });
  return (
    <div
      data-testid="diff-editor-root"
      data-diff-mode={mode}
      data-diff-empty={!diff.hasChanges}
      className="prose prose-neutral dark:prose-invert relative max-w-3xl"
    >
      {!diff.hasChanges && (
        <p
          data-testid="diff-editor-empty"
          className="text-muted-foreground border-border bg-muted/40 not-prose mb-4 rounded-md border px-4 py-3 text-sm"
        >
          No textual differences between this version and its predecessor.
        </p>
      )}
      <Plate editor={editor}>
        <PlateContent readOnly className="outline-none" />
      </Plate>
    </div>
  );
};
