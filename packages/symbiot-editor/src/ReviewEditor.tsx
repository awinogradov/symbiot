import { MarkdownPlugin } from "@platejs/markdown";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plate, PlateContent, usePlateEditor, type PlateEditor } from "platejs/react";
import { Button } from "@symbiot/ui";

import { applyComment } from "./applyComment.ts";
import { SymbiotEditorKit } from "./kit.ts";
import { SelectionToolbar } from "./SelectionToolbar.tsx";
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

const promptForBody = (anchor: string): string | undefined => {
  const snippet = anchor.length > 60 ? `${anchor.slice(0, 60)}…` : anchor;
  return globalThis.prompt(`Comment on "${snippet}"`)?.trim();
};

/**
 * Read-only Plate editor that renders a markdown plan and lets the reviewer
 * drop anchored Comment marks via a floating selection toolbar. Pattern A:
 * editor stays `readOnly={true}`, comment marks are applied programmatically.
 */
export const ReviewEditor = ({ markdown, onReady }: ReviewEditorProps): React.ReactElement => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [bodies, setBodies] = useState<Map<string, string>>(() => new Map());

  const editor = usePlateEditor({
    plugins: SymbiotEditorKit,
    value: (e) => e.getApi(MarkdownPlugin).markdown.deserialize(markdown),
  });

  useTypingGuard(containerRef);
  useReadyHandle(editor, bodies, onReady);

  const onCommentClick = useCallback((): void => {
    const applied = applyComment(editor);
    if (applied === null) return;
    const body = promptForBody(applied.originalText);
    if (body !== undefined && body.length > 0) {
      setBodies((prev) => new Map(prev).set(applied.id, body));
    }
  }, [editor]);

  return (
    <div ref={containerRef} className="prose prose-neutral dark:prose-invert relative max-w-3xl">
      <Plate editor={editor}>
        <PlateContent readOnly className="outline-none" />
      </Plate>
      <SelectionToolbar containerRef={containerRef}>
        <Button variant="ghost" onClick={onCommentClick}>
          Comment
        </Button>
      </SelectionToolbar>
    </div>
  );
};
