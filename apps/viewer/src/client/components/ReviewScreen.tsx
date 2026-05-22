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
  inCompareOverlay: boolean;
  version: ReturnType<typeof useVersionState>;
  state: ReturnType<typeof useReviewState>;
  plan: PlanResponse;
  activePlan: PlanResponse;
}

interface ReviewFlags {
  isHistorical: boolean;
  inCompareOverlay: boolean;
  inDiffMode: boolean;
  canCompareWithPredecessor: boolean;
}

const deriveReviewFlags = (
  version: ReturnType<typeof useVersionState>,
  bootVersion: number
): ReviewFlags => {
  const isHistorical = version.activeVersion !== bootVersion;
  const onBoot = !isHistorical;
  const hasPredecessor = version.previousVersion !== null;
  const canCompareWithPredecessor = onBoot && hasPredecessor;
  const inCompareOverlay = canCompareWithPredecessor && version.compareWithPredecessor;
  const showsDiff = isHistorical || inCompareOverlay;
  const inDiffMode = showsDiff && version.previousPlan !== null;
  return { isHistorical, inCompareOverlay, inDiffMode, canCompareWithPredecessor };
};

const HistoricalPlaceholder = (): React.ReactElement => (
  <div
    data-testid="historical-loading"
    className="text-muted-foreground prose prose-neutral dark:prose-invert max-w-3xl text-sm"
  >
    Loading version diff…
  </div>
);

interface DiffOverlayProps {
  version: ReturnType<typeof useVersionState>;
}

// Historical selection: never mount the editable `EditorMount`. Render the
// read-only `DiffEditor` (which surfaces an empty-state banner when there is
// no predecessor) or a loading placeholder while `previousPlan` is in flight.
// Mounting `EditorMount` here would let its `onChange` persist the historical
// markdown into the boot-slug's draft.
//
// Phase 4.3 — `inCompareOverlay` lifts the same diff render onto the boot
// version so reviewers can see "what changed in this revision" without
// remounting against an older boot.
const DiffOverlay = ({ version }: DiffOverlayProps): React.ReactElement => {
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
};

const EditorPane = ({
  isHistorical,
  inCompareOverlay,
  version,
  state,
  plan,
  activePlan,
}: EditorPaneProps): React.ReactElement => {
  if (isHistorical || inCompareOverlay) return <DiffOverlay version={version} />;
  return (
    <EditorMount
      reloadKey={state.reloadKey}
      activeVersion={version.activeVersion}
      bootVersion={plan.meta.version}
      plan={activePlan}
      initialValue={state.initialValue}
      initialBodies={state.initialBodies}
      initialImages={state.initialImages}
      initialCommentOriginalTexts={state.initialCommentOriginalTexts}
      initialSuggestionOriginalTexts={state.initialSuggestionOriginalTexts}
      initialInsertionNewTexts={state.initialInsertionNewTexts}
      initialInsertionImages={state.initialInsertionImages}
      initialInsertionOriginalTexts={state.initialInsertionOriginalTexts}
      initialReplacementTexts={state.initialReplacementTexts}
      initialReplacementImages={state.initialReplacementImages}
      initialReplacementOriginalTexts={state.initialReplacementOriginalTexts}
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
  const flags = deriveReviewFlags(version, plan.meta.version);
  const { isHistorical, inCompareOverlay, inDiffMode, canCompareWithPredecessor } = flags;

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
            inCompareOverlay={inCompareOverlay}
            version={version}
            state={state}
            plan={plan}
            activePlan={activePlan}
          />
        </main>
        {!isHistorical && !inCompareOverlay && (
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
        canCompareWithPredecessor={canCompareWithPredecessor}
        comparingWithPredecessor={version.compareWithPredecessor}
        onToggleCompare={version.onToggleCompare}
      />
    </SidebarProvider>
  );
};
