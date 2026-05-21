import { useCallback, useEffect, useState } from "react";

import { fetchPlanVersion, fetchPlanVersions } from "../libs/apiClient.ts";
import type { PlanResponse } from "../../shared/apiTypes.ts";

/** Slice of state powering the History tab in the sidebar. */
export interface VersionState {
  /** Ascending list of every version persisted under the plan's history dir. */
  versions: number[];
  /** The version number currently rendered in the editor. */
  activeVersion: number;
  /** Markdown for the currently rendered version (overrides `plan.plan` after a switch). */
  activePlan: string;
  /** Switch the editor to a previously persisted version. */
  onSelectVersion: (version: number) => void;
}

/**
 * Loads the on-disk version history for the active plan and lets the reviewer
 * switch which version the editor renders. The initial `activePlan` mirrors
 * the markdown the server boot-loaded; subsequent switches go through
 * `GET /api/plan/version?n=N`.
 *
 * Drift detection across versions (mapping prior annotations onto the newly
 * rendered text) lands in Phase 4.2 alongside `@platejs/diff`.
 */
export const useVersionState = (plan: PlanResponse): VersionState => {
  const [versions, setVersions] = useState<number[]>([plan.meta.version]);
  const [activeVersion, setActiveVersion] = useState<number>(plan.meta.version);
  const [activePlan, setActivePlan] = useState<string>(plan.plan);

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

  const onSelectVersion = useCallback(
    (version: number): void => {
      if (version === activeVersion) return;
      fetchPlanVersion(version)
        .then((res) => {
          setActivePlan(res.plan);
          setActiveVersion(res.meta.version);
        })
        .catch(() => undefined);
    },
    [activeVersion]
  );

  return { versions, activeVersion, activePlan, onSelectVersion };
};
