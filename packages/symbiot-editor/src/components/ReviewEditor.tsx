import { MarkdownPlugin } from "@platejs/markdown";
import { MessageSquare, Plus, Replace, Strikethrough } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Plate, PlateContent, usePlateEditor, type PlateEditor } from "platejs/react";
import type { PlateValue } from "@symbiot/annotations";
import {
  AnnotationComposer,
  type AnnotationComposerPayload,
} from "@symbiot/ui/components/AnnotationComposer";
import { Button } from "@symbiot/ui/components/Button";

import { applyAnnotation, type AppliedAnnotation } from "../utils/applyAnnotation.ts";
import { SymbiotEditorKit } from "../utils/kit.ts";
import { removeAnnotationMark } from "../utils/removeAnnotationMark.ts";
import { stampBlockLines } from "../utils/sourceLines.ts";
import { useTypingGuard } from "../utils/typingGuard.ts";

import { FloatingToolbar } from "./FloatingToolbar.tsx";

/** Annotation kind that the host can remove via the editor handle. */
export type AnnotationHandleKind = "comment" | "deletion" | "insertion" | "replacement";

/** Imperative handle the host uses to read the current value and annotation maps. */
export interface ReviewEditorHandle {
  getValue: () => unknown[];
  getCommentBodies: () => Map<string, string>;
  getCommentImages: () => Map<string, string[]>;
  /** `originalText` captured at comment creation; drives drift detection. Phase 4.3. */
  getCommentOriginalTexts: () => Map<string, string>;
  /** `originalText` captured at deletion creation; drives drift detection. Phase 4.3. */
  getSuggestionOriginalTexts: () => Map<string, string>;
  /** `newText` (the proposed insertion) captured at insertion creation. Phase 5.2. */
  getInsertionNewTexts: () => Map<string, string>;
  getInsertionImages: () => Map<string, string[]>;
  /** `contextText` snapshot captured at insertion creation; drives drift detection. */
  getInsertionOriginalTexts: () => Map<string, string>;
  /** `replacementText` (the proposed substitution) captured at replacement creation. Phase 5.3. */
  getReplacementTexts: () => Map<string, string>;
  getReplacementImages: () => Map<string, string[]>;
  /** `originalText` snapshot captured at replacement creation; drives drift detection. */
  getReplacementOriginalTexts: () => Map<string, string>;
  removeAnnotation: (kind: AnnotationHandleKind, id: string) => void;
}

/** Snapshot of the editor state surfaced via the onChange callback. */
export interface EditorSnapshot {
  value: PlateValue;
  commentBodies: Map<string, string>;
  commentImages: Map<string, string[]>;
  commentOriginalTexts: Map<string, string>;
  suggestionOriginalTexts: Map<string, string>;
  insertionNewTexts: Map<string, string>;
  insertionImages: Map<string, string[]>;
  insertionOriginalTexts: Map<string, string>;
  replacementTexts: Map<string, string>;
  replacementImages: Map<string, string[]>;
  replacementOriginalTexts: Map<string, string>;
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
  /** Optional saved per-insertion `newText` map (Phase 5.2). */
  initialInsertionNewTexts?: Map<string, string>;
  /** Optional saved per-insertion image refs (Phase 5.2). */
  initialInsertionImages?: Map<string, string[]>;
  /** Optional saved per-insertion `contextText` snapshots (Phase 5.2 drift). */
  initialInsertionOriginalTexts?: Map<string, string>;
  /** Optional saved per-replacement `replacementText` map (Phase 5.3). */
  initialReplacementTexts?: Map<string, string>;
  /** Optional saved per-replacement image refs (Phase 5.3). */
  initialReplacementImages?: Map<string, string[]>;
  /** Optional saved per-replacement `originalText` snapshots (Phase 5.3 drift). */
  initialReplacementOriginalTexts?: Map<string, string>;
  onReady?: (handle: ReviewEditorHandle) => void;
  onChange?: (snapshot: EditorSnapshot) => void;
}

function withoutKey<V>(map: Map<string, V>, key: string): Map<string, V> {
  if (!map.has(key)) return map;
  const next = new Map(map);
  next.delete(key);
  return next;
}

interface AnnotationMaps {
  bodies: Map<string, string>;
  images: Map<string, string[]>;
  commentOriginalTexts: Map<string, string>;
  suggestionOriginalTexts: Map<string, string>;
  insertionNewTexts: Map<string, string>;
  insertionImages: Map<string, string[]>;
  insertionOriginalTexts: Map<string, string>;
  replacementTexts: Map<string, string>;
  replacementImages: Map<string, string[]>;
  replacementOriginalTexts: Map<string, string>;
}

interface PruneSetters {
  setBodies: Dispatch<SetStateAction<Map<string, string>>>;
  setImages: Dispatch<SetStateAction<Map<string, string[]>>>;
  setCommentOriginalTexts: Dispatch<SetStateAction<Map<string, string>>>;
  setSuggestionOriginalTexts: Dispatch<SetStateAction<Map<string, string>>>;
  setInsertionNewTexts: Dispatch<SetStateAction<Map<string, string>>>;
  setInsertionImages: Dispatch<SetStateAction<Map<string, string[]>>>;
  setInsertionOriginalTexts: Dispatch<SetStateAction<Map<string, string>>>;
  setReplacementTexts: Dispatch<SetStateAction<Map<string, string>>>;
  setReplacementImages: Dispatch<SetStateAction<Map<string, string[]>>>;
  setReplacementOriginalTexts: Dispatch<SetStateAction<Map<string, string>>>;
}

const pruneComment = (
  id: string,
  current: AnnotationMaps,
  setters: PruneSetters
): AnnotationMaps => {
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

const pruneDeletion = (
  id: string,
  current: AnnotationMaps,
  setters: PruneSetters
): AnnotationMaps => {
  const suggestionOriginalTexts = withoutKey(current.suggestionOriginalTexts, id);
  if (suggestionOriginalTexts !== current.suggestionOriginalTexts) {
    setters.setSuggestionOriginalTexts(suggestionOriginalTexts);
  }
  return { ...current, suggestionOriginalTexts };
};

const pruneInsertion = (
  id: string,
  current: AnnotationMaps,
  setters: PruneSetters
): AnnotationMaps => {
  const insertionNewTexts = withoutKey(current.insertionNewTexts, id);
  const insertionImages = withoutKey(current.insertionImages, id);
  const insertionOriginalTexts = withoutKey(current.insertionOriginalTexts, id);
  if (insertionNewTexts !== current.insertionNewTexts) {
    setters.setInsertionNewTexts(insertionNewTexts);
  }
  if (insertionImages !== current.insertionImages) {
    setters.setInsertionImages(insertionImages);
  }
  if (insertionOriginalTexts !== current.insertionOriginalTexts) {
    setters.setInsertionOriginalTexts(insertionOriginalTexts);
  }
  return { ...current, insertionNewTexts, insertionImages, insertionOriginalTexts };
};

const pruneReplacement = (
  id: string,
  current: AnnotationMaps,
  setters: PruneSetters
): AnnotationMaps => {
  const replacementTexts = withoutKey(current.replacementTexts, id);
  const replacementImages = withoutKey(current.replacementImages, id);
  const replacementOriginalTexts = withoutKey(current.replacementOriginalTexts, id);
  if (replacementTexts !== current.replacementTexts) {
    setters.setReplacementTexts(replacementTexts);
  }
  if (replacementImages !== current.replacementImages) {
    setters.setReplacementImages(replacementImages);
  }
  if (replacementOriginalTexts !== current.replacementOriginalTexts) {
    setters.setReplacementOriginalTexts(replacementOriginalTexts);
  }
  return { ...current, replacementTexts, replacementImages, replacementOriginalTexts };
};

const pruneRemovedAnnotation = (
  kind: AnnotationHandleKind,
  id: string,
  current: AnnotationMaps,
  setters: PruneSetters
): AnnotationMaps => {
  if (kind === "comment") return pruneComment(id, current, setters);
  if (kind === "deletion") return pruneDeletion(id, current, setters);
  if (kind === "insertion") return pruneInsertion(id, current, setters);
  return pruneReplacement(id, current, setters);
};

const snapshotOf = (editor: PlateEditor, maps: AnnotationMaps): EditorSnapshot => ({
  value: editor.children,
  commentBodies: new Map(maps.bodies),
  commentImages: new Map(maps.images),
  commentOriginalTexts: new Map(maps.commentOriginalTexts),
  suggestionOriginalTexts: new Map(maps.suggestionOriginalTexts),
  insertionNewTexts: new Map(maps.insertionNewTexts),
  insertionImages: new Map(maps.insertionImages),
  insertionOriginalTexts: new Map(maps.insertionOriginalTexts),
  replacementTexts: new Map(maps.replacementTexts),
  replacementImages: new Map(maps.replacementImages),
  replacementOriginalTexts: new Map(maps.replacementOriginalTexts),
});

interface ToolbarButtonsProps {
  onComment: () => void;
  onInsert: () => void;
  onReplace: () => void;
  onDelete: () => void;
}

const ToolbarButtons = ({
  onComment,
  onInsert,
  onReplace,
  onDelete,
}: ToolbarButtonsProps): React.ReactElement => (
  <FloatingToolbar>
    <Button data-testid="toolbar-comment" variant="ghost" size="sm" onClick={onComment}>
      <MessageSquare />
      Comment
    </Button>
    <Button data-testid="toolbar-insert" variant="ghost" size="sm" onClick={onInsert}>
      <Plus />
      Insert
    </Button>
    <Button data-testid="toolbar-replace" variant="ghost" size="sm" onClick={onReplace}>
      <Replace />
      Replace
    </Button>
    <Button data-testid="toolbar-delete" variant="ghost" size="sm" onClick={onDelete}>
      <Strikethrough />
      Delete
    </Button>
  </FloatingToolbar>
);

const useReadyHandle = (
  editor: PlateEditor,
  maps: AnnotationMaps,
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
      getInsertionNewTexts: () => new Map(maps.insertionNewTexts),
      getInsertionImages: () => new Map(maps.insertionImages),
      getInsertionOriginalTexts: () => new Map(maps.insertionOriginalTexts),
      getReplacementTexts: () => new Map(maps.replacementTexts),
      getReplacementImages: () => new Map(maps.replacementImages),
      getReplacementOriginalTexts: () => new Map(maps.replacementOriginalTexts),
      removeAnnotation,
    });
  }, [editor, maps, removeAnnotation, onReady]);
};

type PendingAuthoring =
  | { kind: "comment"; applied: AppliedAnnotation }
  | { kind: "insertion"; applied: AppliedAnnotation }
  | { kind: "replacement"; applied: AppliedAnnotation };

interface InitialState {
  initialBodies?: Map<string, string>;
  initialImages?: Map<string, string[]>;
  initialCommentOriginalTexts?: Map<string, string>;
  initialSuggestionOriginalTexts?: Map<string, string>;
  initialInsertionNewTexts?: Map<string, string>;
  initialInsertionImages?: Map<string, string[]>;
  initialInsertionOriginalTexts?: Map<string, string>;
  initialReplacementTexts?: Map<string, string>;
  initialReplacementImages?: Map<string, string[]>;
  initialReplacementOriginalTexts?: Map<string, string>;
}

interface InsertionState {
  insertionNewTexts: Map<string, string>;
  insertionImages: Map<string, string[]>;
  insertionOriginalTexts: Map<string, string>;
  setInsertionNewTexts: Dispatch<SetStateAction<Map<string, string>>>;
  setInsertionImages: Dispatch<SetStateAction<Map<string, string[]>>>;
  setInsertionOriginalTexts: Dispatch<SetStateAction<Map<string, string>>>;
}

const useInsertionState = (initial: InitialState): InsertionState => {
  const [insertionNewTexts, setInsertionNewTexts] = useState<Map<string, string>>(
    () => new Map(initial.initialInsertionNewTexts ?? new Map())
  );
  const [insertionImages, setInsertionImages] = useState<Map<string, string[]>>(
    () => new Map(initial.initialInsertionImages ?? new Map())
  );
  const [insertionOriginalTexts, setInsertionOriginalTexts] = useState<Map<string, string>>(
    () => new Map(initial.initialInsertionOriginalTexts ?? new Map())
  );
  return {
    insertionNewTexts,
    insertionImages,
    insertionOriginalTexts,
    setInsertionNewTexts,
    setInsertionImages,
    setInsertionOriginalTexts,
  };
};

interface ReplacementState {
  replacementTexts: Map<string, string>;
  replacementImages: Map<string, string[]>;
  replacementOriginalTexts: Map<string, string>;
  setReplacementTexts: Dispatch<SetStateAction<Map<string, string>>>;
  setReplacementImages: Dispatch<SetStateAction<Map<string, string[]>>>;
  setReplacementOriginalTexts: Dispatch<SetStateAction<Map<string, string>>>;
}

const useReplacementState = (initial: InitialState): ReplacementState => {
  const [replacementTexts, setReplacementTexts] = useState<Map<string, string>>(
    () => new Map(initial.initialReplacementTexts ?? new Map())
  );
  const [replacementImages, setReplacementImages] = useState<Map<string, string[]>>(
    () => new Map(initial.initialReplacementImages ?? new Map())
  );
  const [replacementOriginalTexts, setReplacementOriginalTexts] = useState<Map<string, string>>(
    () => new Map(initial.initialReplacementOriginalTexts ?? new Map())
  );
  return {
    replacementTexts,
    replacementImages,
    replacementOriginalTexts,
    setReplacementTexts,
    setReplacementImages,
    setReplacementOriginalTexts,
  };
};

/**
 * Bundles the ten annotation state maps + their setters into one hook.
 *
 * Insertion / Replacement state live in sub-hooks (`useInsertionState`,
 * `useReplacementState`) so the function stays under the 100-line cap. Those
 * sub-hooks return fresh object literals each render — so the `useMemo` here
 * MUST depend on the individual state values they expose, not the wrapping
 * objects. Otherwise `maps` re-creates every render and the snapshot
 * `useEffect` in `ReviewEditor` loops forever.
 */
const useAnnotationState = (
  initial: InitialState
): { maps: AnnotationMaps; setters: PruneSetters } => {
  const [bodies, setBodies] = useState<Map<string, string>>(
    () => new Map(initial.initialBodies ?? new Map())
  );
  const [images, setImages] = useState<Map<string, string[]>>(
    () => new Map(initial.initialImages ?? new Map())
  );
  const [commentOriginalTexts, setCommentOriginalTexts] = useState<Map<string, string>>(
    () => new Map(initial.initialCommentOriginalTexts ?? new Map())
  );
  const [suggestionOriginalTexts, setSuggestionOriginalTexts] = useState<Map<string, string>>(
    () => new Map(initial.initialSuggestionOriginalTexts ?? new Map())
  );
  const {
    insertionNewTexts,
    insertionImages,
    insertionOriginalTexts,
    setInsertionNewTexts,
    setInsertionImages,
    setInsertionOriginalTexts,
  } = useInsertionState(initial);
  const {
    replacementTexts,
    replacementImages,
    replacementOriginalTexts,
    setReplacementTexts,
    setReplacementImages,
    setReplacementOriginalTexts,
  } = useReplacementState(initial);
  const maps = useMemo<AnnotationMaps>(
    () => ({
      bodies,
      images,
      commentOriginalTexts,
      suggestionOriginalTexts,
      insertionNewTexts,
      insertionImages,
      insertionOriginalTexts,
      replacementTexts,
      replacementImages,
      replacementOriginalTexts,
    }),
    [
      bodies,
      images,
      commentOriginalTexts,
      suggestionOriginalTexts,
      insertionNewTexts,
      insertionImages,
      insertionOriginalTexts,
      replacementTexts,
      replacementImages,
      replacementOriginalTexts,
    ]
  );
  const setters = useMemo<PruneSetters>(
    () => ({
      setBodies,
      setImages,
      setCommentOriginalTexts,
      setSuggestionOriginalTexts,
      setInsertionNewTexts,
      setInsertionImages,
      setInsertionOriginalTexts,
      setReplacementTexts,
      setReplacementImages,
      setReplacementOriginalTexts,
    }),
    [
      setInsertionNewTexts,
      setInsertionImages,
      setInsertionOriginalTexts,
      setReplacementTexts,
      setReplacementImages,
      setReplacementOriginalTexts,
    ]
  );
  return { maps, setters };
};

const saveCommentBody = (
  setters: PruneSetters,
  id: string,
  anchorText: string,
  payload: AnnotationComposerPayload
): void => {
  setters.setBodies((prev) => new Map(prev).set(id, payload.body));
  if (payload.images.length > 0) {
    setters.setImages((prev) => new Map(prev).set(id, payload.images));
  }
  setters.setCommentOriginalTexts((prev) => new Map(prev).set(id, anchorText));
};

const saveInsertionBody = (
  setters: PruneSetters,
  id: string,
  anchorText: string,
  payload: AnnotationComposerPayload
): void => {
  setters.setInsertionNewTexts((prev) => new Map(prev).set(id, payload.body));
  if (payload.images.length > 0) {
    setters.setInsertionImages((prev) => new Map(prev).set(id, payload.images));
  }
  setters.setInsertionOriginalTexts((prev) => new Map(prev).set(id, anchorText));
};

const saveReplacementBody = (
  setters: PruneSetters,
  id: string,
  anchorText: string,
  payload: AnnotationComposerPayload
): void => {
  setters.setReplacementTexts((prev) => new Map(prev).set(id, payload.body));
  if (payload.images.length > 0) {
    setters.setReplacementImages((prev) => new Map(prev).set(id, payload.images));
  }
  setters.setReplacementOriginalTexts((prev) => new Map(prev).set(id, anchorText));
};

interface ToolbarHandlers {
  onCommentClick: () => void;
  onInsertClick: () => void;
  onReplaceClick: () => void;
  onDeleteClick: () => void;
}

interface ToolbarHandlerDeps {
  editor: PlateEditor;
  maps: AnnotationMaps;
  setters: PruneSetters;
  setPending: Dispatch<SetStateAction<PendingAuthoring | null>>;
  onChange?: (snapshot: EditorSnapshot) => void;
}

/** Toolbar click handlers — extracted so `ReviewEditor` stays under the line-count cap. */
const useToolbarHandlers = ({
  editor,
  maps,
  setters,
  setPending,
  onChange,
}: ToolbarHandlerDeps): ToolbarHandlers => {
  const openComposer = useCallback(
    (kind: "comment" | "insertion" | "replacement"): void => {
      const applied = applyAnnotation(editor, kind);
      if (applied === null) return;
      setPending({ kind, applied });
    },
    [editor, setPending]
  );
  const onCommentClick = useCallback((): void => openComposer("comment"), [openComposer]);
  const onInsertClick = useCallback((): void => openComposer("insertion"), [openComposer]);
  const onReplaceClick = useCallback((): void => openComposer("replacement"), [openComposer]);
  const onDeleteClick = useCallback((): void => {
    const applied = applyAnnotation(editor, "deletion");
    if (applied === null) {
      onChange?.(snapshotOf(editor, maps));
      return;
    }
    setters.setSuggestionOriginalTexts((prev) => new Map(prev).set(applied.id, applied.anchorText));
  }, [editor, maps, onChange, setters]);
  return { onCommentClick, onInsertClick, onReplaceClick, onDeleteClick };
};

/**
 * Read-only Plate editor that renders a markdown plan and lets the reviewer
 * drop anchored Comment / Deletion / Insertion marks via a floating selection
 * toolbar. Pattern A: editor stays `readOnly={true}`, marks are applied
 * programmatically through {@link applyAnnotation}.
 *
 * Phase 5.2: Insertion authoring shares the Comment composer's UX —
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

  useReadyHandle(editor, maps, onRemoveAnnotation, onReady);

  useEffect(() => {
    onChange?.(snapshotOf(editor, maps));
  }, [editor, maps, onChange]);

  const { onCommentClick, onInsertClick, onReplaceClick, onDeleteClick } = useToolbarHandlers({
    editor,
    maps,
    setters,
    setPending,
    onChange,
  });

  const onComposerSave = useCallback(
    (payload: AnnotationComposerPayload): void => {
      if (pending === null) return;
      const { id, anchorText } = pending.applied;
      if (pending.kind === "comment") {
        saveCommentBody(setters, id, anchorText, payload);
      } else if (pending.kind === "insertion") {
        saveInsertionBody(setters, id, anchorText, payload);
      } else {
        saveReplacementBody(setters, id, anchorText, payload);
      }
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
