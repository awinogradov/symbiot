import { useEffect, useState } from "react";

import { type PlanResponse } from "../../shared/apiTypes.ts";
import { fetchPlan } from "../libs/apiClient.ts";

/**
 * Fetch the plan + viewer mode once on mount. Returns `null` while the request
 * is in flight; thereafter the resolved {@link PlanResponse}. Setter is guarded
 * by an unmount flag so a late resolution can't `setState` on a torn-down tree.
 */
export const useLoadedPlan = (): PlanResponse | null => {
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchPlan()
      .then((next) => {
        if (!cancelled) setPlan(next);
      })
      .catch((error: unknown) => {
        if (!cancelled) console.error("failed to load plan", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return plan;
};
