import { MarkdownPlugin } from "@platejs/markdown";
import { MessageSquare, Strikethrough } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plate, PlateContent, usePlateEditor, type PlateEditor } from "platejs/react";
import type { PlateValue } from "@symbiot/annotations";
import { Button } from "@symbiot/ui/components/Button";
import {
  CommentComposer,
  type CommentComposerPayload,
} from "@symbiot/ui/components/CommentComposer";

import { applyComment, type AppliedComment } from "../utils/applyComment.ts";
import { applyDeletion } from "../utils/applyDeletion.ts";
import { SymbiotEditorKit } from "../utils/kit.ts";
import { removeAnnotationMark } from "../utils/removeAnnotationMark.ts";
import { stampBlockLines } from "../utils/sourceLines.ts";
import { useTypingGuard } from "../utils/typingGuard.ts";

import { FloatingToolbar } from "./FloatingToolbar.tsx";

/** Imperative handle the host uses to read the current value and comment bodies. */
export interface ReviewEditorHandle {
  getValue: () => unknown[];
  getCommentBodies: () => Map<string, string>;
  getCommentImages: () => Map<string, string[]>;
  removeAnnotation: (kind: "comment" | "deletion", id: string) => void;
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
  removeAnnotation: ReviewEditorHandle["removeAnnotation"],
  onReady?: (h: ReviewEditorHandle) => void
): void => {
  useEffect(() => {
    onReady?.({
      getValue: () => editor.children,
      getCommentBodies: () => new Map(bodies),
      getCommentImages: () => new Map(images),
      removeAnnotation,
    });
  }, [editor, bodies, images, removeAnnotation, onReady]);
};

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
  const [pending, setPending] = useState<AppliedComment | null>(null);

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
    (kind: "comment" | "deletion", id: string): void => {
      removeAnnotationMark(editor, kind, id);
      onChange?.({
        value: editor.children,
        commentBodies: new Map(bodies),
        commentImages: new Map(images),
      });
    },
    [bodies, editor, images, onChange]
  );

  useReadyHandle(editor, bodies, images, onRemoveAnnotation, onReady);

  useEffect(() => {
    onChange?.({
      value: editor.children,
      commentBodies: new Map(bodies),
      commentImages: new Map(images),
    });
  }, [editor, bodies, images, onChange]);

  const onCommentClick = useCallback((): void => {
    const applied = applyComment(editor);
    if (applied === null) return;
    setPending(applied);
  }, [editor]);

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
      setBodies((prev) => new Map(prev).set(pending.id, payload.body));
      if (payload.images.length > 0) {
        setImages((prev) => new Map(prev).set(pending.id, payload.images));
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
        <FloatingToolbar>
          <Button data-testid="toolbar-comment" variant="ghost" size="sm" onClick={onCommentClick}>
            <MessageSquare />
            Comment
          </Button>
          <Button data-testid="toolbar-delete" variant="ghost" size="sm" onClick={onDeleteClick}>
            <Strikethrough />
            Delete
          </Button>
        </FloatingToolbar>
      </Plate>
      <CommentComposer
        open={pending !== null}
        quote={pending?.originalText ?? ""}
        onSave={onComposerSave}
        onCancel={onComposerCancel}
      />
    </div>
  );
};
