/**
 * Annotation state hook for `ReviewEditor`. Bundles ten maps (comment
 * bodies/images, suggestion + insertion + replacement texts, plus their
 * `originalText` drift snapshots) plus the matching setters into one object
 * whose shape mirrors `EditorSnapshot`. Insertion / Replacement maps live in
 * sub-hooks so each function stays under the 100-line cap; the `useMemo`
 * around `maps` MUST depend on the individual state values (not the wrapping
 * objects), otherwise `maps` re-creates every render and the snapshot effect
 * in `ReviewEditor` loops forever.
 */
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";

/** Ten-map bundle that mirrors {@link EditorSnapshot}. */
export interface AnnotationMaps {
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

/** Setters paired one-to-one with {@link AnnotationMaps} entries. */
export interface PruneSetters {
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

/** Optional saved-state slice forwarded from the host. */
export interface InitialState {
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

/** Return value of the aggregated annotation-state hook. */
export interface AnnotationStateBundle {
  maps: AnnotationMaps;
  setters: PruneSetters;
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

/** Top-level state hook used by `ReviewEditor`. Combines `useInsertionState` / `useReplacementState`. */
export const useAnnotationState = (initial: InitialState): AnnotationStateBundle => {
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
