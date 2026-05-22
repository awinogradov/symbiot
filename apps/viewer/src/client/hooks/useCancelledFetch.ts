import { useEffect, type DependencyList } from "react";

/**
 * Run an async fetcher inside an effect, swallowing its resolution if the
 * component unmounts (or `deps` change) before the promise settles. Eliminates
 * the `let cancelled = false; … return () => { cancelled = true }` boilerplate
 * shared by `useLoadedPlan`, `useDraft`, and `useVersionState`.
 *
 * `onResolved` and `onRejected` only fire while the effect is still live —
 * callers are free to call setters inside without a torn-down-tree guard.
 *
 * @example
 *   useCancelledFetch(
 *     fetchPlan,
 *     (plan) => setPlan(plan),
 *     (error) => console.error("failed to load plan", error),
 *     [],
 *   );
 */
export const useCancelledFetch = <T>(
  fetcher: () => Promise<T>,
  onResolved: (value: T) => void,
  onRejected: ((error: unknown) => void) | null,
  deps: DependencyList
): void => {
  // The deps array is forwarded verbatim; the linter can't validate the
  // dynamic shape here, but every call site supplies a literal array.
  /* eslint-disable react-hooks/exhaustive-deps, @eslint-react/exhaustive-deps */
  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((value) => {
        if (!cancelled) onResolved(value);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (onRejected !== null) onRejected(error);
      });
    return () => {
      cancelled = true;
    };
  }, deps);
  /* eslint-enable react-hooks/exhaustive-deps, @eslint-react/exhaustive-deps */
};
