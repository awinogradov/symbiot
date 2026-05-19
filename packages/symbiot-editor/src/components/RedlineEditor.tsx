import { MarkdownPlugin } from "@platejs/markdown";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Plate, PlateContent, usePlateEditor, type PlateEditor } from "platejs/react";

import { applyDeletion } from "../utils/applyDeletion.ts";
import { SymbiotEditorKit } from "../utils/kit.ts";
import { stampBlockLines } from "../utils/sourceLines.ts";
import { useTypingGuard } from "../utils/typingGuard.ts";

import type { EditorSnapshot, ReviewEditorHandle } from "./ReviewEditor.tsx";

interface RedlineEditorProps {
  markdown: string;
  initialValue?: unknown[];
  initialBodies?: Map<string, string>;
  initialImages?: Map<string, string[]>;
  onReady?: (handle: ReviewEditorHandle) => void;
  onChange?: (snapshot: EditorSnapshot) => void;
}

const isDeletionKey = (event: KeyboardEvent<HTMLDivElement>): boolean =>
  event.key === "Delete" || event.key === "Backspace";

const hasSelection = (editor: PlateEditor): boolean => {
  if (editor.selection === null) return false;
  return editor.api.string(editor.selection).length > 0;
};

/**
 * Read-only editor in "Redline" mode. Same Plate kit as `ReviewEditor`, but a
 * keydown handler on Delete / Backspace turns any non-empty selection into a
 * Deletion mark via `applyDeletion`. No debounced auto-deletion: the user has
 * to press a key, mirroring the way you'd cross out a printed page.
 *
 * Comment authoring is still available; clients usually hide the toolbar
 * Comment button in Redline mode at the App level.
 */
export const RedlineEditor = ({
  markdown,
  initialValue,
  initialBodies,
  initialImages,
  onReady,
  onChange,
}: RedlineEditorProps): React.ReactElement => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [bodies] = useState<Map<string, string>>(() => new Map(initialBodies ?? new Map()));
  const [images] = useState<Map<string, string[]>>(() => new Map(initialImages ?? new Map()));

  const editor = usePlateEditor({
    plugins: SymbiotEditorKit,
    value: (e): never => {
      if (initialValue !== undefined) return initialValue as never;
      const deserialized = e.getApi(MarkdownPlugin).markdown.deserialize(markdown);
      return stampBlockLines(markdown, deserialized) as never;
    },
  });

  useTypingGuard(containerRef);

  useEffect(() => {
    onReady?.({
      getValue: () => editor.children,
      getCommentBodies: () => new Map(bodies),
      getCommentImages: () => new Map(images),
    });
  }, [editor, bodies, images, onReady]);

  useEffect(() => {
    onChange?.({
      value: editor.children,
      commentBodies: new Map(bodies),
      commentImages: new Map(images),
    });
  }, [editor, bodies, images, onChange]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (!isDeletionKey(event)) return;
      if (!hasSelection(editor)) return;
      event.preventDefault();
      applyDeletion(editor);
      onChange?.({
        value: editor.children,
        commentBodies: new Map(bodies),
        commentImages: new Map(images),
      });
    },
    [bodies, editor, images, onChange]
  );

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- read-only Plate root captures Delete/Backspace at the wrapper; tab order lives inside <PlateContent>.
    <div
      ref={containerRef}
      data-testid="redline-editor-root"
      onKeyDown={onKeyDown}
      className="prose prose-neutral dark:prose-invert relative max-w-3xl"
    >
      <Plate editor={editor}>
        <PlateContent readOnly className="outline-none" />
      </Plate>
    </div>
  );
};
