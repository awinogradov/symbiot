import { MarkdownPlugin } from "@platejs/markdown";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plate, PlateContent, usePlateEditor, type PlateEditor } from "platejs/react";
import { Button, CommentComposer } from "@symbiot/ui";

import { applyComment, type AppliedComment } from "./applyComment.ts";
import { SymbiotEditorKit } from "./kit.ts";
import { SelectionToolbar } from "./SelectionToolbar.tsx";
import { useSelectionRect, type Rect } from "./selectionRect.ts";
import { useTypingGuard } from "./typingGuard.ts";

/** Imperative handle the host uses to read the current value and comment bodies. */
export interface ReviewEditorHandle {
  getValue: () => unknown[];
  getCommentBodies: () => Map<string, string>;
}

interface ReviewEditorProps {
  markdown: string;
  onReady?: (handle: ReviewEditorHandle) => void;
}

const useReadyHandle = (
  editor: PlateEditor,
  bodies: Map<string, string>,
  onReady?: (h: ReviewEditorHandle) => void
): void => {
  useEffect(() => {
    onReady?.({
      getValue: () => editor.children,
      getCommentBodies: () => new Map(bodies),
    });
  }, [editor, bodies, onReady]);
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
 */
export const ReviewEditor = ({ markdown, onReady }: ReviewEditorProps): React.ReactElement => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [bodies, setBodies] = useState<Map<string, string>>(() => new Map());
  const [pending, setPending] = useState<PendingComment | null>(null);
  const liveRect = useSelectionRect(containerRef);

  const editor = usePlateEditor({
    plugins: SymbiotEditorKit,
    value: (e) => e.getApi(MarkdownPlugin).markdown.deserialize(markdown),
  });

  useTypingGuard(containerRef);
  useReadyHandle(editor, bodies, onReady);

  const onCommentClick = useCallback((): void => {
    if (liveRect === null) return;
    const applied = applyComment(editor);
    if (applied === null) return;
    setPending({ applied, rect: liveRect });
  }, [editor, liveRect]);

  const onComposerSave = useCallback(
    (body: string): void => {
      if (pending === null) return;
      setBodies((prev) => new Map(prev).set(pending.applied.id, body));
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
