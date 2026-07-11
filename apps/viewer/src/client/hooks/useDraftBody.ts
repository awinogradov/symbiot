/**
 * Draft-mode autosave: persists the typed markdown via `/api/draft` so an
 * accidental tab close within a live session loses nothing.
 *
 * Hydration precedence: the payload is applied only when its `version` equals
 * the boot version. Every viewer boot bumps the version, so a stale blob from
 * a crashed prior run can never mask the fresh CLI seed — across runs the CLI
 * file always wins; within a session a reload restores the typed text.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { getDraftBody, putDraftBody } from "../libs/apiClient.ts";

import { useCancelledFetch } from "./useCancelledFetch.ts";

/** Surface returned by {@link useDraftBody}. */
export interface DraftBodyHook {
  /** Autosaved markdown for THIS boot version, or null when none applies. */
  loaded: string | null;
  /** True until the first `GET /api/draft` resolves. */
  isLoading: boolean;
  /**
   * Debounced auto-save — pass a lazy getter so serialization runs once per
   * flush, not on every keystroke.
   */
  save: (getMarkdown: () => string) => void;
  /** Cancel any pending debounced save AND disable future saves (call at submit start). */
  cancel: () => void;
}

const debounceMs = 1_000;

export const useDraftBody = (bootVersion: number): DraftBodyHook => {
  const [loaded, setLoaded] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disabledRef = useRef(false);

  useCancelledFetch(
    getDraftBody,
    (payload) => {
      setLoaded(payload !== null && payload.version === bootVersion ? payload.markdown : null);
      setIsLoading(false);
    },
    (error) => {
      console.error("failed to load draft body", error);
      setIsLoading(false);
    },
    []
  );

  const save = useCallback(
    (getMarkdown: () => string): void => {
      if (disabledRef.current) return;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (disabledRef.current) return;
        void putDraftBody({
          markdown: getMarkdown(),
          version: bootVersion,
          updatedAt: Date.now(),
        }).catch((error: unknown) => {
          console.error("failed to save draft body", error);
        });
      }, debounceMs);
    },
    [bootVersion]
  );

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
