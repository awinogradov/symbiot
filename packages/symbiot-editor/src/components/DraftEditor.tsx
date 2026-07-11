import { MarkdownPlugin } from "@platejs/markdown";
import { useCallback, useEffect } from "react";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";

import { SymbiotDraftKit } from "../utils/kit.ts";

/**
 * Imperative handle exposed by {@link DraftEditor} once Plate is constructed.
 * The host pulls markdown lazily (autosave, Send to agent, Approve) instead of
 * paying serialization on every keystroke.
 */
export interface DraftEditorHandle {
  /** Serialize the current Plate value back to markdown. */
  getMarkdown: () => string;
}

/** Props accepted by {@link DraftEditor}. */
interface DraftEditorProps {
  /** Markdown the draft session boots from (seed file or blank template). */
  markdown: string;
  /** Receives the imperative handle once Plate is constructed. */
  onReady?: (handle: DraftEditorHandle) => void;
  /** Fires on every Plate editor change; pull markdown via the handle when needed. */
  onChange?: () => void;
}

/**
 * Editable Plate editor for the `draft` viewer mode — the author writes plan
 * markdown as free text. Unlike {@link ReviewEditor} there is no `readOnly`
 * and no typing guard: the document body itself is the editing surface, and
 * annotation marks never apply here ({@link SymbiotDraftKit} carries only the
 * shared markdown surface). `getMarkdown()` runs the markdown round-trip in
 * reverse (`editor.api.markdown.serialize`), pinned deterministic and lossless
 * by `utils/markdownRoundTrip.test.ts` (NFR-4).
 *
 * @example
 * ```tsx
 * <DraftEditor
 *   markdown={plan}
 *   onReady={(handle) => { handleRef.current = handle; }}
 *   onChange={scheduleAutosave}
 * />
 * ```
 */
export const DraftEditor = ({
  markdown,
  onReady,
  onChange,
}: DraftEditorProps): React.ReactElement => {
  const editor = usePlateEditor({
    plugins: SymbiotDraftKit,
    value: (e): never => e.getApi(MarkdownPlugin).markdown.deserialize(markdown) as never,
  });

  useEffect(() => {
    onReady?.({ getMarkdown: () => editor.getApi(MarkdownPlugin).markdown.serialize() });
  }, [editor, onReady]);

  const handleChange = useCallback(() => onChange?.(), [onChange]);

  return (
    <div
      data-testid="draft-editor-root"
      className="prose prose-neutral dark:prose-invert relative mx-auto max-w-3xl"
    >
      <Plate editor={editor} onChange={handleChange}>
        <PlateContent className="outline-none" />
      </Plate>
    </div>
  );
};
