import { useCallback, useState } from "react";

import { AnnotationList, ClearAllFooter } from "./AnnotationSidebarList.tsx";
import { HistoryPanel } from "./AnnotationSidebarHistory.tsx";
import { type AnnotationSidebarEntry, type SidebarDiffMode } from "./AnnotationSidebarTypes.tsx";
import { Badge } from "./Badge.tsx";
import { Sidebar } from "./Sidebar.tsx";
import { SidebarContent, SidebarGroup } from "./SidebarSection.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs.tsx";

/** Props driving the annotation sidebar shell. */
interface AnnotationSidebarProps {
  entries: AnnotationSidebarEntry[];
  onFocus: (id: string) => void;
  onRemove: (entry: AnnotationSidebarEntry) => void;
  /** Open the edit composer for a body-bearing entry. */
  onEdit: (entry: AnnotationSidebarEntry) => void;
  onClearAll: () => void;
  /** Versions persisted on disk for this plan, ascending. */
  versions: number[];
  /** Currently rendered version. */
  activeVersion: number;
  /** Called when the reviewer picks a different version from the History tab. */
  onSelectVersion: (version: number) => void;
  /**
   * When `true`, render the Clean/Raw toggle above the version list. The host
   * derives this from "active version is not the boot version AND a
   * predecessor exists" so the toggle only shows when a diff is actually
   * being rendered.
   */
  showDiffToggle: boolean;
  /** Current Clean/Raw selection. */
  diffMode: SidebarDiffMode;
  /** Called when the reviewer flips Clean ↔ Raw. */
  onDiffModeChange: (mode: SidebarDiffMode) => void;
  /**
   * When `true`, render a button that flips the editor pane into a read-only
   * diff overlay of "current vs predecessor". Host gates this on "active
   * version is the boot version AND a predecessor exists".
   */
  canCompareWithPredecessor: boolean;
  /** Whether the predecessor-diff overlay is currently active. */
  comparingWithPredecessor: boolean;
  /** Flip the predecessor-diff overlay. */
  onToggleCompare: () => void;
}

type TabValue = "annotations" | "history";

/**
 * Resolve which tab to render given the user's last-chosen `tab` and whether
 * History is currently available. When the user is parked on History but
 * History is no longer rendered (versions dropped below 2), fall back to
 * Annotations so the sidebar body doesn't go blank. Preserves the user's
 * stated `tab` so History is restored automatically once it returns.
 */
const resolveEffectiveTab = (tab: TabValue, hasHistory: boolean): TabValue =>
  !hasHistory && tab === "history" ? "annotations" : tab;

/**
 * Right-aligned `<Sidebar>` with a tab bar that always renders the Annotations
 * tab — its title carries the live entry count — and reveals the History tab
 * (a `VersionBrowser` listing every persisted plan version) only when at least
 * two versions exist.
 *
 * "Clear all" only renders on the Annotations tab so a stray click can't lose
 * work while the reviewer is browsing history.
 */
export const AnnotationSidebar = ({
  entries,
  onFocus,
  onRemove,
  onEdit,
  onClearAll,
  versions,
  activeVersion,
  onSelectVersion,
  showDiffToggle,
  diffMode,
  onDiffModeChange,
  canCompareWithPredecessor,
  comparingWithPredecessor,
  onToggleCompare,
}: AnnotationSidebarProps): React.ReactElement => {
  const hasHistory = versions.length >= 2;
  const [tab, setTab] = useState<TabValue>("annotations");
  const effectiveTab = resolveEffectiveTab(tab, hasHistory);
  const handleTabChange = useCallback((next: string): void => {
    if (next === "annotations" || next === "history") setTab(next);
  }, []);
  const handleDiffModeChange = useCallback(
    (next: string): void => {
      if (next === "clean" || next === "raw") onDiffModeChange(next);
    },
    [onDiffModeChange]
  );
  const showClearAll = entries.length > 0 && effectiveTab === "annotations";
  return (
    <Sidebar side="right" collapsible="offcanvas" data-testid="annotation-sidebar" className="w-80">
      <SidebarContent>
        <Tabs
          value={effectiveTab}
          onValueChange={handleTabChange}
          className="flex w-full flex-col gap-2"
        >
          <div className="flex h-14 items-center px-2">
            <TabsList className="flex w-full">
              <TabsTrigger
                data-testid="sidebar-tab-annotations"
                value="annotations"
                className="flex-1"
              >
                Annotations
                <Badge variant="secondary" data-testid="sidebar-total-count">
                  {entries.length}
                </Badge>
              </TabsTrigger>
              {hasHistory && (
                <TabsTrigger data-testid="sidebar-tab-history" value="history" className="flex-1">
                  History
                </TabsTrigger>
              )}
            </TabsList>
          </div>
          <TabsContent value="annotations">
            <SidebarGroup className="px-2">
              <AnnotationList
                entries={entries}
                onFocus={onFocus}
                onRemove={onRemove}
                onEdit={onEdit}
              />
            </SidebarGroup>
          </TabsContent>
          {hasHistory && (
            <TabsContent value="history">
              <HistoryPanel
                versions={versions}
                activeVersion={activeVersion}
                onSelectVersion={onSelectVersion}
                showDiffToggle={showDiffToggle}
                diffMode={diffMode}
                onDiffModeChange={handleDiffModeChange}
                canCompareWithPredecessor={canCompareWithPredecessor}
                comparingWithPredecessor={comparingWithPredecessor}
                onToggleCompare={onToggleCompare}
              />
            </TabsContent>
          )}
        </Tabs>
      </SidebarContent>
      {showClearAll && <ClearAllFooter onClearAll={onClearAll} />}
    </Sidebar>
  );
};
