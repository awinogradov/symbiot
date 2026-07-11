import { useDraft } from "../hooks/useDraft.ts";
import { type PlanResponse } from "../../shared/apiTypes.ts";

import { DraftScreen } from "./DraftScreen.tsx";
import { LoadingFallback } from "./LoadingFallback.tsx";
import { ReviewScreen } from "./ReviewScreen.tsx";

/** Props for the draft-aware gate around `ReviewScreen`. */
interface PlanLoadedProps {
  /** Plan response returned from `GET /api/plan` on mount. */
  plan: PlanResponse;
}

/** Gates `<ReviewScreen>` on the first `GET /api/draft` response (annotation-shaped payload). */
const ReviewLoaded = ({ plan }: PlanLoadedProps): React.ReactElement => {
  const { loaded: draft, isLoading, save, cancel } = useDraft();
  if (isLoading) return <LoadingFallback label="Loading draft…" />;
  return <ReviewScreen plan={plan} draft={draft} saveDraft={save} cancelDraft={cancel} />;
};

/**
 * Routes by viewer mode: `draft` gets the edit-first surface (which owns its
 * own markdown-shaped autosave), everything else the review surface. The
 * branch sits ABOVE the draft hooks because the two modes parse the persisted
 * `/api/draft` body with different schemas.
 */
export const PlanLoaded = ({ plan }: PlanLoadedProps): React.ReactElement =>
  plan.mode === "draft" ? <DraftScreen plan={plan} /> : <ReviewLoaded plan={plan} />;
