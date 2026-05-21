import { AnnotationSidebar } from "@symbiot/ui/components/AnnotationSidebar";
import { GlobalCommentFab } from "@symbiot/ui/components/GlobalCommentFab";
import { SidebarInset, SidebarProvider } from "@symbiot/ui/components/Sidebar";
import { TopBar } from "@symbiot/ui/components/TopBar";

import { useReviewState } from "../hooks/useReviewState.ts";
import { useReviewSubmit } from "../hooks/useReviewSubmit.ts";
import { useVersionState } from "../hooks/useVersionState.ts";
import { type DraftPayload, type PlanResponse } from "../../shared/apiTypes.ts";
import { focusAnnotation } from "../utils/sidebarProjection.ts";

import { DiffMount } from "./DiffMount.tsx";
import { EditorMount } from "./EditorMount.tsx";
import { SubmittedScreen } from "./SubmittedScreen.tsx";

interface ReviewScreenProps {
  plan: PlanResponse;
  draft: DraftPayload | null;
  saveDraft: Parameters<typeof useReviewState>[0]["saveDraft"];
  cancelDraft: () => void;
}

interface EditorPaneProps {
  isHistorical: boolean;
  version: ReturnType<typeof useVersionState>;
  state: ReturnType<typeof useReviewState>;
  plan: PlanResponse;
  activePlan: PlanResponse;
}

const HistoricalPlaceholder = (): React.ReactElement => (
  <div
    data-testid="historical-loading"
    className="text-muted-foreground prose prose-neutral dark:prose-invert max-w-3xl text-sm"
  >
    Loading version diff…
  </div>
);

const EditorPane = ({
  isHistorical,
  version,
  state,
  plan,
  activePlan,
}: EditorPaneProps): React.ReactElement => {
  // Historical selection: never mount the editable `EditorMount`. Render the
  // read-only `DiffEditor` (which surfaces an empty-state banner when there
  // is no predecessor) or a loading placeholder while `previousPlan` is in
  // flight. Mounting `EditorMount` here would let its `onChange` persist the
  // historical markdown into the boot-slug's draft.
  if (isHistorical) {
    if (version.previousPlan === null && version.previousVersion !== null) {
      return <HistoricalPlaceholder />;
    }
    return (
      <DiffMount
        current={version.activePlan}
        previous={version.previousPlan ?? version.activePlan}
        currentVersion={version.activeVersion}
        previousVersion={version.previousVersion}
        mode={version.diffMode}
      />
    );
  }
  return (
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
  );
};

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
  const isHistorical = version.activeVersion !== plan.meta.version;
  const inDiffMode = isHistorical && version.previousPlan !== null;

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
          <EditorPane
            isHistorical={isHistorical}
            version={version}
            state={state}
            plan={plan}
            activePlan={activePlan}
          />
        </main>
        {!isHistorical && (
          <GlobalCommentFab
            onAddGlobalComment={state.onAddGlobalComment}
            disabled={phase === "submitting"}
          />
        )}
      </SidebarInset>
      <AnnotationSidebar
        entries={state.sidebarEntries}
        onFocus={focusAnnotation}
        onRemove={state.onRemoveAnnotation}
        onClearAll={state.onClearAll}
        versions={version.versions}
        activeVersion={version.activeVersion}
        onSelectVersion={version.onSelectVersion}
        showDiffToggle={inDiffMode}
        diffMode={version.diffMode}
        onDiffModeChange={version.onDiffModeChange}
      />
    </SidebarProvider>
  );
};
