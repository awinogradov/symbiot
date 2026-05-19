import { AnnotationSidebar } from "@symbiot/ui/components/AnnotationSidebar";
import { SidebarProvider } from "@symbiot/ui/components/Sidebar";
import { ThemeProvider } from "@symbiot/ui/components/ThemeProvider";
import { TopBar } from "@symbiot/ui/components/TopBar";

import { useDraft } from "../hooks/useDraft.ts";
import { useLoadedPlan } from "../hooks/useLoadedPlan.ts";
import { useReviewState, type ReviewProps } from "../hooks/useReviewState.ts";
import { type PlanResponse } from "../libs/api.ts";
import { focusAnnotation } from "../utils/sidebarProjection.ts";

import { EditorMount } from "./EditorMount.tsx";

const submittedHeading = (mode: PlanResponse["mode"]): string =>
  mode === "annotate" ? "Feedback submitted." : "Sent to the agent.";

interface SubmittedScreenProps {
  mode: PlanResponse["mode"];
}

const SubmittedScreen = ({ mode }: SubmittedScreenProps): React.ReactElement => (
  <div
    data-testid="submitted-screen"
    className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-sm"
  >
    <p className="text-foreground text-lg font-medium">{submittedHeading(mode)}</p>
    <p>You can close this window.</p>
  </div>
);

const ReviewScreen = ({ plan, draft, saveDraft, cancelDraft }: ReviewProps): React.ReactElement => {
  const state = useReviewState({ plan, draft, saveDraft, cancelDraft });
  const {
    phase,
    editorMode,
    sidebarEntries,
    initialValue,
    initialBodies,
    initialImages,
    reloadKey,
    setEditorHandle,
    onEditorModeChange,
    onEditorChange,
    onApprove,
    onSubmit,
    onAddGlobalComment,
    onClearAll,
  } = state;

  if (phase === "done") return <SubmittedScreen mode={plan.mode} />;

  return (
    <SidebarProvider>
      <div className="flex h-full flex-col">
        <TopBar
          onApprove={onApprove}
          onDeny={onSubmit}
          onAddGlobalComment={onAddGlobalComment}
          busy={phase === "submitting"}
          mode={plan.mode}
          editorMode={editorMode}
          onEditorModeChange={onEditorModeChange}
        />
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-auto px-8 py-6">
            <EditorMount
              editorMode={editorMode}
              reloadKey={reloadKey}
              plan={plan}
              initialValue={initialValue}
              initialBodies={initialBodies}
              initialImages={initialImages}
              onReady={setEditorHandle}
              onChange={onEditorChange}
            />
          </main>
          <AnnotationSidebar
            entries={sidebarEntries}
            onFocus={focusAnnotation}
            onClearAll={onClearAll}
          />
        </div>
      </div>
    </SidebarProvider>
  );
};

interface PlanLoadedProps {
  plan: PlanResponse;
}

const PlanLoaded = ({ plan }: PlanLoadedProps): React.ReactElement => {
  const {
    loaded: draft,
    isLoading: draftLoading,
    save: saveDraft,
    cancel: cancelDraft,
  } = useDraft();
  if (draftLoading) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center">
        Loading draft…
      </div>
    );
  }
  return <ReviewScreen plan={plan} draft={draft} saveDraft={saveDraft} cancelDraft={cancelDraft} />;
};

export const App = (): React.ReactElement => {
  const plan = useLoadedPlan();
  return (
    <ThemeProvider>
      {plan === null ? (
        <div className="text-muted-foreground flex h-full items-center justify-center">
          Loading plan…
        </div>
      ) : (
        <PlanLoaded plan={plan} />
      )}
    </ThemeProvider>
  );
};
