import { MarkdownPlugin } from "@platejs/markdown";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";
import {
  AnnotationComposer,
  type AnnotationComposerPayload,
} from "@symbiot/ui/components/AnnotationComposer";

import { SymbiotEditorKit } from "../utils/kit.ts";
import { removeAnnotationMark } from "../utils/removeAnnotationMark.ts";
import { stampBlockLines } from "../utils/sourceLines.ts";
import { useTypingGuard } from "../utils/typingGuard.ts";

import {
  type PendingAuthoring,
  dispatchComposerSave,
  useReadyHandle,
  useToolbarHandlers,
} from "./ReviewEditorAuthoring.tsx";
import { pruneRemovedAnnotation, snapshotOf } from "./ReviewEditorPrune.tsx";
import { useAnnotationState } from "./ReviewEditorState.tsx";
import { ToolbarButtons } from "./ReviewEditorToolbar.tsx";
import {
  type AnnotationHandleKind,
  type EditorSnapshot,
  type ReviewEditorHandle,
} from "./ReviewEditorTypes.tsx";

// Re-export the public types so existing consumers keep importing them from
// `@symbiot/editor/components/ReviewEditor`. The internal `*Types.tsx` file is
// the source of truth.
export type { AnnotationHandleKind, EditorSnapshot, ReviewEditorHandle };

/** Props accepted by {@link ReviewEditor}. */
interface ReviewEditorProps {
  /** Markdown of the plan version being reviewed. */
  markdown: string;
  /** Optional saved Plate value to hydrate the editor from (overrides markdown deserialize). */
  initialValue?: unknown[];
  /** Optional saved comment bodies to seed the discussion store. */
  initialBodies?: Map<string, string>;
  /** Optional saved comment images, keyed by comment id. */
  initialImages?: Map<string, string[]>;
  /** Optional saved per-comment `originalText` snapshots — drives drift detection. */
  initialCommentOriginalTexts?: Map<string, string>;
  /** Optional saved per-deletion `originalText` snapshots — drives drift detection. */
  initialSuggestionOriginalTexts?: Map<string, string>;
  /** Optional saved per-insertion `newText` map. */
  initialInsertionNewTexts?: Map<string, string>;
  /** Optional saved per-insertion image refs. */
  initialInsertionImages?: Map<string, string[]>;
  /** Optional saved per-insertion `contextText` snapshots — drives drift detection. */
  initialInsertionOriginalTexts?: Map<string, string>;
  /** Optional saved per-replacement `replacementText` map. */
  initialReplacementTexts?: Map<string, string>;
  /** Optional saved per-replacement image refs. */
  initialReplacementImages?: Map<string, string[]>;
  /** Optional saved per-replacement `originalText` snapshots — drives drift detection. */
  initialReplacementOriginalTexts?: Map<string, string>;
  /** Receives the imperative handle once Plate is constructed. */
  onReady?: (handle: ReviewEditorHandle) => void;
  /** Fires on every Plate editor change with a serializable snapshot. */
  onChange?: (snapshot: EditorSnapshot) => void;
  /** Fires when the inline annotation composer opens (true) or closes (false). */
  onComposerOpenChange?: (open: boolean) => void;
}

/**
 * Read-only Plate editor that renders a markdown plan and lets the reviewer
 * drop anchored Comment / Deletion / Insertion / Replacement marks via a
 * floating selection toolbar. The editor stays `readOnly={true}`; marks are
 * applied programmatically through {@link applyAnnotation} via `editor.tf.*`
 * transforms, which bypass `contenteditable=false`.
 *
 * Insertion authoring shares the Comment composer's UX —
 * {@link AnnotationComposer} switches accent + labels based on `kind`.
 */
export const ReviewEditor = ({
  markdown,
  initialValue,
  initialBodies,
  initialImages,
  initialCommentOriginalTexts,
  initialSuggestionOriginalTexts,
  initialInsertionNewTexts,
  initialInsertionImages,
  initialInsertionOriginalTexts,
  initialReplacementTexts,
  initialReplacementImages,
  initialReplacementOriginalTexts,
  onReady,
  onChange,
  onComposerOpenChange,
}: ReviewEditorProps): React.ReactElement => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { maps, setters } = useAnnotationState({
    initialBodies,
    initialImages,
    initialCommentOriginalTexts,
    initialSuggestionOriginalTexts,
    initialInsertionNewTexts,
    initialInsertionImages,
    initialInsertionOriginalTexts,
    initialReplacementTexts,
    initialReplacementImages,
    initialReplacementOriginalTexts,
  });
  const [pending, setPending] = useState<PendingAuthoring | null>(null);

  const editor = usePlateEditor({
    plugins: SymbiotEditorKit,
    value: (e): never => {
      if (initialValue !== undefined) return initialValue as never;
      const deserialized = e.getApi(MarkdownPlugin).markdown.deserialize(markdown);
      return stampBlockLines(markdown, deserialized) as never;
    },
  });

  useTypingGuard(containerRef);

  const onRemoveAnnotation = useCallback(
    (kind: AnnotationHandleKind, id: string): void => {
      removeAnnotationMark(editor, kind, id);
      const next = pruneRemovedAnnotation(kind, id, maps, setters);
      onChange?.(snapshotOf(editor, next));
    },
    [editor, maps, onChange, setters]
  );

  useEffect(() => {
    onChange?.(snapshotOf(editor, maps));
  }, [editor, maps, onChange]);

  useEffect(() => {
    onComposerOpenChange?.(pending !== null);
  }, [pending, onComposerOpenChange]);

  const { onCommentClick, onInsertClick, onReplaceClick, onDeleteClick, triggerAnnotation } =
    useToolbarHandlers({
      editor,
      maps,
      setters,
      setPending,
      onChange,
    });

  useReadyHandle(editor, maps, onRemoveAnnotation, triggerAnnotation, onReady);

  const onComposerSave = useCallback(
    (payload: AnnotationComposerPayload): void => {
      if (pending === null) return;
      dispatchComposerSave(pending, payload, setters);
      setPending(null);
    },
    [pending, setters]
  );

  const onComposerCancel = useCallback((): void => setPending(null), []);

  return (
    <div
      ref={containerRef}
      data-testid="editor-root"
      className="prose prose-neutral dark:prose-invert relative max-w-3xl"
    >
      <Plate editor={editor}>
        <PlateContent readOnly className="outline-none" />
        <ToolbarButtons
          onComment={onCommentClick}
          onInsert={onInsertClick}
          onReplace={onReplaceClick}
          onDelete={onDeleteClick}
        />
      </Plate>
      <AnnotationComposer
        kind={pending?.kind ?? "comment"}
        open={pending !== null}
        quote={pending?.applied.anchorText ?? ""}
        onSave={onComposerSave}
        onCancel={onComposerCancel}
      />
    </div>
  );
};
