import { Suspense, lazy, useCallback, useRef, useState, type CSSProperties } from "react";
import { AnnotationSidebar } from "@symbiot/ui/components/AnnotationSidebar";
import { SidebarInset } from "@symbiot/ui/components/SidebarChrome";
import { SidebarProvider } from "@symbiot/ui/components/SidebarProvider";
import { TopBar } from "@symbiot/ui/components/TopBar";
import { type DraftEditorHandle } from "@symbiot/editor/components/DraftEditor";

import { useDocumentTitle } from "../hooks/useDocumentTitle.ts";
import { useDraftBody } from "../hooks/useDraftBody.ts";
import { useDraftSubmit } from "../hooks/useDraftSubmit.ts";
import { useVersionState } from "../hooks/useVersionState.ts";
import { type PlanResponse } from "../../shared/apiTypes.ts";

import { EditorErrorBoundary } from "./EditorErrorBoundary.tsx";
import { LoadingFallback } from "./LoadingFallback.tsx";
import { SubmittedScreen } from "./SubmittedScreen.tsx";

// Same lazy-chunk rationale as ReviewScreen: keep Plate off the first paint.
const DraftMount = lazy(() => import("./DraftMount.tsx").then((m) => ({ default: m.DraftMount })));
const DiffMount = lazy(() => import("./DiffMount.tsx").then((m) => ({ default: m.DiffMount })));

const noop = (): void => undefined;

/** Derived pane-routing flags for the draft session. */
interface DraftFlags {
  isHistorical: boolean;
  inCompareOverlay: boolean;
  inDiffMode: boolean;
  canCompareWithPredecessor: boolean;
}

const deriveDraftFlags = (
  version: ReturnType<typeof useVersionState>,
  bootVersion: number
): DraftFlags => {
  const isHistorical = version.activeVersion !== bootVersion;
  const canCompareWithPredecessor = !isHistorical && version.previousVersion !== null;
  const inCompareOverlay = canCompareWithPredecessor && version.compareWithPredecessor;
  const showsDiff = isHistorical || inCompareOverlay;
  return {
    isHistorical,
    inCompareOverlay,
    inDiffMode: showsDiff && version.previousPlan !== null,
    canCompareWithPredecessor,
  };
};

/** Pane selector: read-only revision diff, or the editable draft surface. */
interface DraftPaneProps {
  showsDiff: boolean;
  version: ReturnType<typeof useVersionState>;
  markdown: string;
  bootVersion: number;
  onReady: (handle: DraftEditorHandle) => void;
  onChange: () => void;
}

const DraftPane = ({
  showsDiff,
  version,
  markdown,
  bootVersion,
  onReady,
  onChange,
}: DraftPaneProps): React.ReactElement => {
  if (showsDiff) {
    if (version.previousPlan === null && version.previousVersion !== null) {
      return (
        <div
          data-testid="historical-loading"
          className="text-muted-foreground prose prose-neutral dark:prose-invert mx-auto max-w-3xl text-sm"
        >
          Loading version diff…
        </div>
      );
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
    <DraftMount markdown={markdown} version={bootVersion} onReady={onReady} onChange={onChange} />
  );
};

/** Props for the edit-first draft surface. */
interface DraftScreenProps {
  /** Boot-version plan markdown + meta (mode is `draft`). */
  plan: PlanResponse;
}

/**
 * Send/Approve are disabled until the editable surface delivers its
 * serialize-back handle — they have nothing to submit before that.
 */
const isTopBarBusy = (
  phase: ReturnType<typeof useDraftSubmit>["phase"],
  editorHandle: DraftEditorHandle | null
): boolean => phase === "submitting" || editorHandle === null;

/**
 * Edit-first authoring surface for `draft` mode: the author types plan
 * markdown directly (no annotation tools, no review hotkeys), autosaves per
 * boot version, and resolves the session via "Send to agent" or "Approve".
 * When the boot version has a predecessor, the session leads with the
 * revision's inline diff (auto-compare) and "Back to editing" returns here.
 */
export const DraftScreen = ({ plan }: DraftScreenProps): React.ReactElement => {
  const { loaded, isLoading, save, cancel } = useDraftBody(plan.meta.version);
  const version = useVersionState(plan, { autoCompareOnBoot: true });
  const [editorHandle, setEditorHandle] = useState<DraftEditorHandle | null>(null);
  const handleRef = useRef<DraftEditorHandle | null>(null);
  useDocumentTitle(plan.meta.displayName, plan.plan);
  const { phase, outcome, onSend, onApprove } = useDraftSubmit({
    editorHandle,
    cancelDraft: cancel,
  });

  const onReady = useCallback((handle: DraftEditorHandle): void => {
    handleRef.current = handle;
    setEditorHandle(handle);
  }, []);

  const onEditorChange = useCallback((): void => {
    save(() => handleRef.current?.getMarkdown() ?? "");
  }, [save]);

  if (isLoading) return <LoadingFallback label="Loading draft…" />;
  if (phase === "done") return <SubmittedScreen mode="draft" draftOutcome={outcome} />;

  const flags = deriveDraftFlags(version, plan.meta.version);

  return (
    <SidebarProvider defaultOpen style={{ "--sidebar-width": "20rem" } as CSSProperties}>
      <SidebarInset className="flex h-svh flex-col">
        <TopBar
          onApprove={onApprove}
          onDeny={noop}
          onSend={onSend}
          projectName={plan.meta.displayName}
          busy={isTopBarBusy(phase, editorHandle)}
          mode="draft"
        />
        <div className="flex-1 overflow-auto p-15">
          <EditorErrorBoundary>
            <Suspense fallback={<LoadingFallback label="Loading editor…" />}>
              <DraftPane
                showsDiff={flags.isHistorical || flags.inCompareOverlay}
                version={version}
                markdown={loaded ?? plan.plan}
                bootVersion={plan.meta.version}
                onReady={onReady}
                onChange={onEditorChange}
              />
            </Suspense>
          </EditorErrorBoundary>
        </div>
      </SidebarInset>
      <AnnotationSidebar
        entries={[]}
        onFocus={noop}
        onRemove={noop}
        onEdit={noop}
        onClearAll={noop}
        versions={version.versions}
        activeVersion={version.activeVersion}
        onSelectVersion={version.onSelectVersion}
        showDiffToggle={flags.inDiffMode}
        diffMode={version.diffMode}
        onDiffModeChange={version.onDiffModeChange}
        canCompareWithPredecessor={flags.canCompareWithPredecessor}
        comparingWithPredecessor={version.compareWithPredecessor}
        onToggleCompare={version.onToggleCompare}
      />
    </SidebarProvider>
  );
};
