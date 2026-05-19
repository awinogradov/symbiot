import { useCallback, useEffect, useRef, useState } from "react";

import { getDraft, putDraft, type DraftPayload } from "./api.ts";

/** Captured editor state passed in on each change. */
export interface DraftSnapshot {
  value: unknown[];
  commentBodies: Map<string, string>;
  globalComments: { id: string; body: string }[];
}

interface DraftHook {
  /** The draft loaded on mount, or null if none existed / still loading. */
  loaded: DraftPayload | null;
  /** True until the first GET /api/draft resolves. */
  isLoading: boolean;
  /** Debounced auto-save call — pass the latest editor snapshot on every change. */
  save: (snapshot: DraftSnapshot) => void;
}

const toPayload = (snapshot: DraftSnapshot): DraftPayload => ({
  value: snapshot.value,
  commentBodies: Object.fromEntries(snapshot.commentBodies),
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

  useEffect(() => {
    let cancelled = false;
    getDraft()
      .then((draft) => {
        if (cancelled) return;
        setLoaded(draft);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        console.error("failed to load draft", error);
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback((snapshot: DraftSnapshot): void => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void putDraft(toPayload(snapshot)).catch((error: unknown) => {
        console.error("failed to save draft", error);
      });
    }, debounceMs);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    []
  );

  return { loaded, isLoading, save };
};
