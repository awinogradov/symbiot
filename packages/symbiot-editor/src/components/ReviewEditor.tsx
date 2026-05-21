import { MarkdownPlugin } from "@platejs/markdown";
import { MessageSquare, Strikethrough } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  /** `originalText` captured at comment creation; drives drift detection. Phase 4.3. */
  getCommentOriginalTexts: () => Map<string, string>;
  /** `originalText` captured at deletion creation; drives drift detection. Phase 4.3. */
  getSuggestionOriginalTexts: () => Map<string, string>;
  removeAnnotation: (kind: "comment" | "deletion", id: string) => void;
}

/** Snapshot of the editor state surfaced via the onChange callback. */
export interface EditorSnapshot {
  value: PlateValue;
  commentBodies: Map<string, string>;
  commentImages: Map<string, string[]>;
  commentOriginalTexts: Map<string, string>;
  suggestionOriginalTexts: Map<string, string>;
}

interface ReviewEditorProps {
  markdown: string;
  /** Optional saved Plate value to hydrate the editor from (overrides markdown deserialize). */
  initialValue?: unknown[];
  /** Optional saved comment bodies to seed the discussion store. */
  initialBodies?: Map<string, string>;
  /** Optional saved comment images, keyed by comment id. */
  initialImages?: Map<string, string[]>;
  /** Optional saved per-comment `originalText` snapshots (Phase 4.3 drift). */
  initialCommentOriginalTexts?: Map<string, string>;
  /** Optional saved per-deletion `originalText` snapshots (Phase 4.3 drift). */
  initialSuggestionOriginalTexts?: Map<string, string>;
  onReady?: (handle: ReviewEditorHandle) => void;
  onChange?: (snapshot: EditorSnapshot) => void;
}

function withoutKey<V>(map: Map<string, V>, key: string): Map<string, V> {
  if (!map.has(key)) return map;
  const next = new Map(map);
  next.delete(key);
  return next;
}

interface CommentMaps {
  bodies: Map<string, string>;
  images: Map<string, string[]>;
  commentOriginalTexts: Map<string, string>;
  suggestionOriginalTexts: Map<string, string>;
}

interface PruneSetters {
  setBodies: (next: Map<string, string>) => void;
  setImages: (next: Map<string, string[]>) => void;
  setCommentOriginalTexts: (next: Map<string, string>) => void;
  setSuggestionOriginalTexts: (next: Map<string, string>) => void;
}

const pruneComment = (id: string, current: CommentMaps, setters: PruneSetters): CommentMaps => {
  const bodies = withoutKey(current.bodies, id);
  const images = withoutKey(current.images, id);
  const commentOriginalTexts = withoutKey(current.commentOriginalTexts, id);
  if (bodies !== current.bodies) setters.setBodies(bodies);
  if (images !== current.images) setters.setImages(images);
  if (commentOriginalTexts !== current.commentOriginalTexts) {
    setters.setCommentOriginalTexts(commentOriginalTexts);
  }
  return { ...current, bodies, images, commentOriginalTexts };
};

const pruneDeletion = (id: string, current: CommentMaps, setters: PruneSetters): CommentMaps => {
  const suggestionOriginalTexts = withoutKey(current.suggestionOriginalTexts, id);
  if (suggestionOriginalTexts !== current.suggestionOriginalTexts) {
    setters.setSuggestionOriginalTexts(suggestionOriginalTexts);
  }
  return { ...current, suggestionOriginalTexts };
};

const pruneRemovedAnnotation = (
  kind: "comment" | "deletion",
  id: string,
  current: CommentMaps,
  setters: PruneSetters
): CommentMaps =>
  kind === "comment" ? pruneComment(id, current, setters) : pruneDeletion(id, current, setters);

const snapshotOf = (editor: PlateEditor, maps: CommentMaps): EditorSnapshot => ({
  value: editor.children,
  commentBodies: new Map(maps.bodies),
  commentImages: new Map(maps.images),
  commentOriginalTexts: new Map(maps.commentOriginalTexts),
  suggestionOriginalTexts: new Map(maps.suggestionOriginalTexts),
});

interface ToolbarButtonsProps {
  onComment: () => void;
  onDelete: () => void;
}

const ToolbarButtons = ({ onComment, onDelete }: ToolbarButtonsProps): React.ReactElement => (
  <FloatingToolbar>
    <Button data-testid="toolbar-comment" variant="ghost" size="sm" onClick={onComment}>
      <MessageSquare />
      Comment
    </Button>
    <Button data-testid="toolbar-delete" variant="ghost" size="sm" onClick={onDelete}>
      <Strikethrough />
      Delete
    </Button>
  </FloatingToolbar>
);

const useReadyHandle = (
  editor: PlateEditor,
  maps: CommentMaps,
  removeAnnotation: ReviewEditorHandle["removeAnnotation"],
  onReady?: (h: ReviewEditorHandle) => void
): void => {
  useEffect(() => {
    onReady?.({
      getValue: () => editor.children,
      getCommentBodies: () => new Map(maps.bodies),
      getCommentImages: () => new Map(maps.images),
      getCommentOriginalTexts: () => new Map(maps.commentOriginalTexts),
      getSuggestionOriginalTexts: () => new Map(maps.suggestionOriginalTexts),
      removeAnnotation,
    });
  }, [editor, maps, removeAnnotation, onReady]);
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
  initialCommentOriginalTexts,
  initialSuggestionOriginalTexts,
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
  const [commentOriginalTexts, setCommentOriginalTexts] = useState<Map<string, string>>(
    () => new Map(initialCommentOriginalTexts ?? new Map())
  );
  const [suggestionOriginalTexts, setSuggestionOriginalTexts] = useState<Map<string, string>>(
    () => new Map(initialSuggestionOriginalTexts ?? new Map())
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

  const maps = useMemo<CommentMaps>(
    () => ({ bodies, images, commentOriginalTexts, suggestionOriginalTexts }),
    [bodies, images, commentOriginalTexts, suggestionOriginalTexts]
  );

  const setters = useMemo<PruneSetters>(
    () => ({ setBodies, setImages, setCommentOriginalTexts, setSuggestionOriginalTexts }),
    []
  );

  const onRemoveAnnotation = useCallback(
    (kind: "comment" | "deletion", id: string): void => {
      removeAnnotationMark(editor, kind, id);
      const next = pruneRemovedAnnotation(kind, id, maps, setters);
      onChange?.(snapshotOf(editor, next));
    },
    [editor, maps, onChange, setters]
  );

  useReadyHandle(editor, maps, onRemoveAnnotation, onReady);

  useEffect(() => {
    onChange?.(snapshotOf(editor, maps));
  }, [editor, maps, onChange]);

  const onCommentClick = useCallback((): void => {
    const applied = applyComment(editor);
    if (applied === null) return;
    setPending(applied);
  }, [editor]);

  const onDeleteClick = useCallback((): void => {
    const applied = applyDeletion(editor);
    if (applied === null) {
      onChange?.(snapshotOf(editor, maps));
      return;
    }
    setSuggestionOriginalTexts((prev) => new Map(prev).set(applied.id, applied.originalText));
    // onChange fires via the effect above once the state lands.
  }, [editor, maps, onChange]);

  const onComposerSave = useCallback(
    (payload: CommentComposerPayload): void => {
      if (pending === null) return;
      setBodies((prev) => new Map(prev).set(pending.id, payload.body));
      if (payload.images.length > 0) {
        setImages((prev) => new Map(prev).set(pending.id, payload.images));
      }
      setCommentOriginalTexts((prev) => new Map(prev).set(pending.id, pending.originalText));
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
        <ToolbarButtons onComment={onCommentClick} onDelete={onDeleteClick} />
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
