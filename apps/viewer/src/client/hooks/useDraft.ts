import { useCallback, useEffect, useRef, useState } from "react";

import { type DraftPayload } from "../../shared/apiTypes.ts";
import { getDraft, putDraft } from "../libs/apiClient.ts";

import { useCancelledFetch } from "./useCancelledFetch.ts";

/** Captured editor state passed in on each change. */
export interface DraftSnapshot {
  value: unknown[];
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
  globalComments: { id: string; body: string; images?: string[] }[];
}

interface DraftHook {
  /** The draft loaded on mount, or null if none existed / still loading. */
  loaded: DraftPayload | null;
  /** True until the first GET /api/draft resolves. */
  isLoading: boolean;
  /** Debounced auto-save call — pass the latest editor snapshot on every change. */
  save: (snapshot: DraftSnapshot) => void;
  /**
   * Cancel any pending debounced save AND disable future `save` calls.
   * Call this at the start of submission so a queued POST doesn't fire after
   * the explicit DELETE and re-create the draft on disk.
   */
  cancel: () => void;
}

const toPayload = (snapshot: DraftSnapshot): DraftPayload => ({
  value: snapshot.value,
  commentBodies: Object.fromEntries(snapshot.commentBodies),
  commentImages: Object.fromEntries(snapshot.commentImages),
  commentOriginalTexts: Object.fromEntries(snapshot.commentOriginalTexts),
  suggestionOriginalTexts: Object.fromEntries(snapshot.suggestionOriginalTexts),
  insertionNewTexts: Object.fromEntries(snapshot.insertionNewTexts),
  insertionImages: Object.fromEntries(snapshot.insertionImages),
  insertionOriginalTexts: Object.fromEntries(snapshot.insertionOriginalTexts),
  replacementTexts: Object.fromEntries(snapshot.replacementTexts),
  replacementImages: Object.fromEntries(snapshot.replacementImages),
  replacementOriginalTexts: Object.fromEntries(snapshot.replacementOriginalTexts),
  globalComments: snapshot.globalComments,
  updatedAt: Date.now(),
});

const debounceMs = 1_000;

/**
 * Auto-save the reviewer's in-progress annotations to the server so they
 * survive page reloads. Loads any existing draft on mount; debounces save
 * calls by 1s; the caller invokes DELETE explicitly on submit.
 */
export const useDraft = (): DraftHook => {
  const [loaded, setLoaded] = useState<DraftPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disabledRef = useRef(false);

  useCancelledFetch(
    getDraft,
    (draft) => {
      setLoaded(draft);
      setIsLoading(false);
    },
    (error) => {
      console.error("failed to load draft", error);
      setIsLoading(false);
    },
    []
  );

  const save = useCallback((snapshot: DraftSnapshot): void => {
    if (disabledRef.current) return;
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (disabledRef.current) return;
      void putDraft(toPayload(snapshot)).catch((error: unknown) => {
        console.error("failed to save draft", error);
      });
    }, debounceMs);
  }, []);

  const cancel = useCallback((): void => {
    disabledRef.current = true;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    []
  );

  return { loaded, isLoading, save, cancel };
};
