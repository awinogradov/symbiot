import { AnnotationSidebar } from "@symbiot/ui/components/AnnotationSidebar";
import { SidebarInset, SidebarProvider } from "@symbiot/ui/components/Sidebar";
import { TopBar } from "@symbiot/ui/components/TopBar";

import { useReviewState } from "../hooks/useReviewState.ts";
import { useReviewSubmit } from "../hooks/useReviewSubmit.ts";
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
  const { phase, onApprove, onSubmit } = useReviewSubmit({
    planMode: plan.mode,
    editorHandle: state.editorHandle,
    collectEntries: state.collectEntries,
    cancelDraft,
  });

  if (phase === "done") return <SubmittedScreen mode={plan.mode} />;

  return (
    <SidebarProvider defaultOpen>
      <SidebarInset className="flex h-svh flex-col">
        <TopBar
          onApprove={onApprove}
          onDeny={onSubmit}
          onAddGlobalComment={state.onAddGlobalComment}
          busy={phase === "submitting"}
          mode={plan.mode}
          editorMode={state.editorMode}
          onEditorModeChange={state.onEditorModeChange}
          showSidebarTrigger
        />
        <main className="flex-1 overflow-auto px-8 py-6">
          <EditorMount
            editorMode={state.editorMode}
            reloadKey={state.reloadKey}
            plan={plan}
            initialValue={state.initialValue}
            initialBodies={state.initialBodies}
            initialImages={state.initialImages}
            onReady={state.setEditorHandle}
            onChange={state.onEditorChange}
          />
        </main>
      </SidebarInset>
      <AnnotationSidebar
        entries={state.sidebarEntries}
        onFocus={focusAnnotation}
        onClearAll={state.onClearAll}
      />
    </SidebarProvider>
  );
};
