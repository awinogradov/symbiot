import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DiffMode } from "@symbiot/editor/components/DiffEditor";

import { fetchPlanVersion, fetchPlanVersions } from "../libs/apiClient.ts";
import type { PlanResponse, PlanVersionResponse } from "../../shared/apiTypes.ts";

const diffModeStorageKey = "symbiot.diffMode";

const readDiffMode = (): DiffMode => {
  if (typeof window === "undefined") return "clean";
  const raw = window.localStorage.getItem(diffModeStorageKey);
  return raw === "raw" ? "raw" : "clean";
};

const writeDiffMode = (mode: DiffMode): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(diffModeStorageKey, mode);
};

/** Slice of state powering the History tab in the sidebar. */
export interface VersionState {
  /** Ascending list of every version persisted under the plan's history dir. */
  versions: number[];
  /** The version number currently rendered in the editor. */
  activeVersion: number;
  /** Markdown for the currently rendered version (overrides `plan.plan` after a switch). */
  activePlan: string;
  /** Version number immediately preceding `activeVersion`. `null` when none exists. */
  previousVersion: number | null;
  /** Markdown for the version immediately preceding `activeVersion`. `null` when none exists. */
  previousPlan: string | null;
  /** Diff render mode for the History tab toggle. Persisted per browser. */
  diffMode: DiffMode;
  /** Switch the editor to a previously persisted version. */
  onSelectVersion: (version: number) => void;
  /** Update the Clean/Raw toggle for diff rendering. */
  onDiffModeChange: (mode: DiffMode) => void;
}

const findPredecessor = (versions: number[], active: number): number | null => {
  const idx = versions.indexOf(active);
  if (idx <= 0) return null;
  return versions[idx - 1] ?? null;
};

/**
 * Loads the on-disk version history for the active plan and lets the reviewer
 * switch which version the editor renders. The initial `activePlan` mirrors
 * the markdown the server boot-loaded; subsequent switches go through
 * `GET /api/plan/version?n=N`. `previousPlan` is fetched lazily whenever
 * `activeVersion` changes so the diff editor has both sides available.
 *
 * Drift detection across versions (mapping prior annotations onto the newly
 * rendered text) lands in Phase 4.3.
 */
export const useVersionState = (plan: PlanResponse): VersionState => {
  const [versions, setVersions] = useState<number[]>([plan.meta.version]);
  const [activeVersion, setActiveVersion] = useState<number>(plan.meta.version);
  const [activePlan, setActivePlan] = useState<string>(plan.plan);
  const [previousFetched, setPreviousFetched] = useState<{
    version: number;
    plan: string;
  } | null>(null);
  const [diffMode, setDiffMode] = useState<DiffMode>(readDiffMode);

  useEffect(() => {
    let cancelled = false;
    fetchPlanVersions()
      .then((res) => {
        if (cancelled) return;
        setVersions(res.versions.length > 0 ? res.versions : [plan.meta.version]);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [plan.meta.version]);

  const latestActiveRequestRef = useRef(0);
  const latestPreviousRequestRef = useRef(0);

  const previousVersion = useMemo(
    () => findPredecessor(versions, activeVersion),
    [versions, activeVersion]
  );

  useEffect(() => {
    if (previousVersion === null) return;
    latestPreviousRequestRef.current += 1;
    const requestId = latestPreviousRequestRef.current;
    fetchPlanVersion(previousVersion)
      .then((res: PlanVersionResponse) => {
        if (requestId !== latestPreviousRequestRef.current) return;
        setPreviousFetched({ version: previousVersion, plan: res.plan });
      })
      .catch(() => undefined);
  }, [previousVersion]);

  // Derived: only surface `previousPlan` when the fetched markdown matches
  // the current predecessor. Avoids a synchronous setState-in-effect when
  // the active version has no predecessor (the smallest version on disk).
  const previousPlan =
    previousVersion !== null && previousFetched?.version === previousVersion
      ? previousFetched.plan
      : null;

  const onSelectVersion = useCallback(
    (version: number): void => {
      if (version === activeVersion) return;
      latestActiveRequestRef.current += 1;
      const requestId = latestActiveRequestRef.current;
      fetchPlanVersion(version)
        .then((res) => {
          if (requestId !== latestActiveRequestRef.current) return;
          setActivePlan(res.plan);
          setActiveVersion(res.meta.version);
        })
        .catch(() => undefined);
    },
    [activeVersion]
  );

  const onDiffModeChange = useCallback((mode: DiffMode): void => {
    setDiffMode(mode);
    writeDiffMode(mode);
  }, []);

  return {
    versions,
    activeVersion,
    activePlan,
    previousVersion,
    previousPlan,
    diffMode,
    onSelectVersion,
    onDiffModeChange,
  };
};
