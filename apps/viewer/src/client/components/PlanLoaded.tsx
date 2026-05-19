import { useDraft } from "../hooks/useDraft.ts";
import { type PlanResponse } from "../../shared/apiTypes.ts";

import { LoadingFallback } from "./LoadingFallback.tsx";
import { ReviewScreen } from "./ReviewScreen.tsx";

interface PlanLoadedProps {
  plan: PlanResponse;
}

/** Gates `<ReviewScreen>` on the first `GET /api/draft` response. */
export const PlanLoaded = ({ plan }: PlanLoadedProps): React.ReactElement => {
  const { loaded: draft, isLoading, save, cancel } = useDraft();
  if (isLoading) return <LoadingFallback label="Loading draft…" />;
  return <ReviewScreen plan={plan} draft={draft} saveDraft={save} cancelDraft={cancel} />;
};
