import { MarkdownPlugin } from "@platejs/markdown";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plate, PlateContent, usePlateEditor, type PlateEditor } from "platejs/react";
import type { PlateValue } from "@symbiot/annotations";
import { Button, CommentComposer, type CommentComposerPayload } from "@symbiot/ui";

import { applyComment, type AppliedComment } from "./applyComment.ts";
import { applyDeletion } from "./applyDeletion.ts";
import { SymbiotEditorKit } from "./kit.ts";
import { SelectionToolbar } from "./SelectionToolbar.tsx";
import { useSelectionRect, type Rect } from "./selectionRect.ts";
import { stampBlockLines } from "./sourceLines.ts";
import { useTypingGuard } from "./typingGuard.ts";

/** Imperative handle the host uses to read the current value and comment bodies. */
export interface ReviewEditorHandle {
  getValue: () => unknown[];
  getCommentBodies: () => Map<string, string>;
  getCommentImages: () => Map<string, string[]>;
}

/** Snapshot of the editor state surfaced via the onChange callback. */
export interface EditorSnapshot {
  value: PlateValue;
  commentBodies: Map<string, string>;
  commentImages: Map<string, string[]>;
}

interface ReviewEditorProps {
  markdown: string;
  /** Optional saved Plate value to hydrate the editor from (overrides markdown deserialize). */
  initialValue?: unknown[];
  /** Optional saved comment bodies to seed the discussion store. */
  initialBodies?: Map<string, string>;
  /** Optional saved comment images, keyed by comment id. */
  initialImages?: Map<string, string[]>;
  onReady?: (handle: ReviewEditorHandle) => void;
  onChange?: (snapshot: EditorSnapshot) => void;
}

const useReadyHandle = (
  editor: PlateEditor,
  bodies: Map<string, string>,
  images: Map<string, string[]>,
  onReady?: (h: ReviewEditorHandle) => void
): void => {
  useEffect(() => {
    onReady?.({
      getValue: () => editor.children,
      getCommentBodies: () => new Map(bodies),
      getCommentImages: () => new Map(images),
    });
  }, [editor, bodies, images, onReady]);
};

interface PendingComment {
  applied: AppliedComment;
  rect: Rect;
}

interface ComposerAnchorProps {
  rect: Rect;
}

const ComposerAnchor = ({ rect }: ComposerAnchorProps): React.ReactElement => (
  <div
    data-testid="composer-anchor"
    style={{
      position: "absolute",
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      pointerEvents: "none",
    }}
  />
);

/**
 * Read-only Plate editor that renders a markdown plan and lets the reviewer
 * drop anchored Comment marks via a floating selection toolbar. Pattern A:
 * editor stays `readOnly={true}`, comment marks are applied programmatically.
 *
 * Phase 3.3: composer can attach images (uploaded to `/api/upload`), surfaced
 * back via `getCommentImages()` and threaded into the codec's `images?` field.
 */
export const ReviewEditor = ({
  markdown,
  initialValue,
  initialBodies,
  initialImages,
  onReady,
  onChange,
}: ReviewEditorProps): React.ReactElement => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [bodies, setBodies] = useState<Map<string, string>>(
    () => new Map(initialBodies ?? new Map())
  );
  const [images, setImages] = useState<Map<string, string[]>>(
    () => new Map(initialImages ?? new Map())
  );
  const [pending, setPending] = useState<PendingComment | null>(null);
  const liveRect = useSelectionRect(containerRef);

  const editor = usePlateEditor({
    plugins: SymbiotEditorKit,
    value: (e): never => {
      if (initialValue !== undefined) return initialValue as never;
      const deserialized = e.getApi(MarkdownPlugin).markdown.deserialize(markdown);
      return stampBlockLines(markdown, deserialized) as never;
    },
  });

  useTypingGuard(containerRef);
  useReadyHandle(editor, bodies, images, onReady);

  useEffect(() => {
    onChange?.({
      value: editor.children,
      commentBodies: new Map(bodies),
      commentImages: new Map(images),
    });
  }, [editor, bodies, images, onChange]);

  const onCommentClick = useCallback((): void => {
    if (liveRect === null) return;
    const applied = applyComment(editor);
    if (applied === null) return;
    setPending({ applied, rect: liveRect });
  }, [editor, liveRect]);

  const onDeleteClick = useCallback((): void => {
    applyDeletion(editor);
    onChange?.({
      value: editor.children,
      commentBodies: new Map(bodies),
      commentImages: new Map(images),
    });
  }, [bodies, editor, images, onChange]);

  const onComposerSave = useCallback(
    (payload: CommentComposerPayload): void => {
      if (pending === null) return;
      setBodies((prev) => new Map(prev).set(pending.applied.id, payload.body));
      if (payload.images.length > 0) {
        setImages((prev) => new Map(prev).set(pending.applied.id, payload.images));
      }
      setPending(null);
    },
    [pending]
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
      </Plate>
      <SelectionToolbar containerRef={containerRef}>
        <Button data-testid="toolbar-comment" variant="ghost" onClick={onCommentClick}>
          Comment
        </Button>
        <Button data-testid="toolbar-delete" variant="ghost" onClick={onDeleteClick}>
          Delete
        </Button>
      </SelectionToolbar>
      {pending !== null && (
        <CommentComposer
          open
          anchor={<ComposerAnchor rect={pending.rect} />}
          onSave={onComposerSave}
          onCancel={onComposerCancel}
        />
      )}
    </div>
  );
};
