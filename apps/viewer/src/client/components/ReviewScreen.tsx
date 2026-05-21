import { AnnotationSidebar } from "@symbiot/ui/components/AnnotationSidebar";
import { GlobalCommentFab } from "@symbiot/ui/components/GlobalCommentFab";
import { SidebarInset, SidebarProvider } from "@symbiot/ui/components/Sidebar";
import { TopBar } from "@symbiot/ui/components/TopBar";

import { useReviewState } from "../hooks/useReviewState.ts";
import { useReviewSubmit } from "../hooks/useReviewSubmit.ts";
import { useVersionState } from "../hooks/useVersionState.ts";
import { type DraftPayload, type PlanResponse } from "../../shared/apiTypes.ts";
import { focusAnnotation } from "../utils/sidebarProjection.ts";

import { EditorMount } from "./EditorMount.tsx";
import { SubmittedScreen } from "./SubmittedScreen.tsx";

interface ReviewScreenProps {
  plan: PlanResponse;
  draft: DraftPayload | null;
  saveDraft: Parameters<typeof useReviewState>[0]["saveDraft"];
  cancelDraft: () => void;
}

/** Composes the topbar, editor, and annotation sidebar; renders `<SubmittedScreen>` once submitted. */
export const ReviewScreen = ({
  plan,
  draft,
  saveDraft,
  cancelDraft,
}: ReviewScreenProps): React.ReactElement => {
  const state = useReviewState({ draft, saveDraft });
  const version = useVersionState(plan);
  const { phase, onApprove, onSubmit } = useReviewSubmit({
    planMode: plan.mode,
    editorHandle: state.editorHandle,
    collectEntries: state.collectEntries,
    cancelDraft,
  });

  if (phase === "done") return <SubmittedScreen mode={plan.mode} />;

  const activePlan: PlanResponse = {
    ...plan,
    plan: version.activePlan,
    meta: { ...plan.meta, version: version.activeVersion },
  };

  return (
    <SidebarProvider defaultOpen>
      <SidebarInset className="flex h-svh flex-col">
        <TopBar
          onApprove={onApprove}
          onDeny={onSubmit}
          projectName={plan.meta.project}
          busy={phase === "submitting"}
          mode={plan.mode}
          showSidebarTrigger
          hasAnnotations={state.sidebarEntries.length > 0}
        />
        <main className="flex-1 overflow-auto px-8 py-6">
          <EditorMount
            reloadKey={state.reloadKey}
            activeVersion={version.activeVersion}
            bootVersion={plan.meta.version}
            plan={activePlan}
            initialValue={state.initialValue}
            initialBodies={state.initialBodies}
            initialImages={state.initialImages}
            onReady={state.setEditorHandle}
            onChange={state.onEditorChange}
          />
        </main>
        <GlobalCommentFab
          onAddGlobalComment={state.onAddGlobalComment}
          disabled={phase === "submitting"}
        />
      </SidebarInset>
      <AnnotationSidebar
        entries={state.sidebarEntries}
        onFocus={focusAnnotation}
        onRemove={state.onRemoveAnnotation}
        onClearAll={state.onClearAll}
        versions={version.versions}
        activeVersion={version.activeVersion}
        onSelectVersion={version.onSelectVersion}
      />
    </SidebarProvider>
  );
};
