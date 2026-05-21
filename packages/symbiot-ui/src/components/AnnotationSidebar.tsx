import { Trash2, X } from "lucide-react";
import { memo, useCallback, useState } from "react";

import { cn } from "../utils/cn.ts";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./AlertDialog.tsx";
import { Badge } from "./Badge.tsx";
import { Button } from "./Button.tsx";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./Sidebar.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs.tsx";
import { ToggleGroup, ToggleGroupItem } from "./ToggleGroup.tsx";
import { VersionBrowser } from "./VersionBrowser.tsx";

/**
 * Sidebar-friendly projection of an annotation. Keeps `kind` + `id` + `text` so
 * the right panel doesn't depend on the full `@symbiot/annotations` type tree —
 * the host serializes once and passes the result.
 */
export interface AnnotationSidebarEntry {
  id: string;
  kind: "comment" | "deletion" | "global";
  /** Either the anchored selection (C/D) or the body (G). */
  primary: string;
  /** Comment body for C; undefined for G/D. */
  body?: string;
  lines?: { startLine: number; endLine: number };
  /**
   * `true` when the annotation's anchor could not be resolved against the
   * current plan version (path + text-quote both failed). Surfaced as a
   * "drifted" badge in the sidebar.
   */
  drifted?: boolean;
}

/** Diff render mode controlled by the Clean/Raw toggle inside the History tab. */
export type SidebarDiffMode = "clean" | "raw";

interface AnnotationSidebarProps {
  entries: AnnotationSidebarEntry[];
  onFocus: (id: string) => void;
  onRemove: (entry: AnnotationSidebarEntry) => void;
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
}

const kindLabel = (kind: AnnotationSidebarEntry["kind"]): string => {
  switch (kind) {
    case "comment":
      return "Comment";
    case "deletion":
      return "Deletion";
    case "global":
      return "Global";
  }
};

const kindClass = (kind: AnnotationSidebarEntry["kind"]): string => {
  switch (kind) {
    case "comment":
    case "global":
      return "text-anno-comment";
    case "deletion":
      return "text-anno-delete";
  }
};

const removalDescription = (kind: AnnotationSidebarEntry["kind"]): string => {
  switch (kind) {
    case "comment":
      return "This removes the comment from the plan. It can't be undone.";
    case "deletion":
      return "This removes the deletion suggestion from the plan. It can't be undone.";
    case "global":
      return "This removes the global comment from the plan. It can't be undone.";
  }
};

interface EntryRowProps {
  entry: AnnotationSidebarEntry;
  onFocus: (id: string) => void;
  onRemove: (entry: AnnotationSidebarEntry) => void;
}

const stopPointerPropagation = (event: React.PointerEvent<HTMLButtonElement>): void => {
  event.stopPropagation();
};

const EntryRowInner = ({ entry, onFocus, onRemove }: EntryRowProps): React.ReactElement => {
  const handleClick = useCallback((): void => onFocus(entry.id), [entry.id, onFocus]);
  const handleConfirm = useCallback((): void => onRemove(entry), [entry, onRemove]);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        data-testid={`sidebar-entry-${entry.id}`}
        data-kind={entry.kind}
        onClick={handleClick}
        size="lg"
        className="group-hover/menu-item:bg-sidebar-accent group-hover/menu-item:text-sidebar-accent-foreground flex h-auto flex-col items-start gap-1 py-2 pr-9"
      >
        <div className="text-muted-foreground flex w-full items-center justify-between gap-2 text-xs">
          <span className={cn("font-medium", kindClass(entry.kind))}>{kindLabel(entry.kind)}</span>
          <div className="flex items-center gap-1.5">
            {entry.drifted === true && (
              <Badge
                variant="destructive"
                data-testid={`sidebar-entry-${entry.id}-drift`}
                className="px-1.5 py-0 text-[10px]"
              >
                drifted
              </Badge>
            )}
            {entry.lines !== undefined && (
              <span>
                lines {entry.lines.startLine}–{entry.lines.endLine}
              </span>
            )}
          </div>
        </div>
        <span className="line-clamp-2 w-full text-sm font-medium">{entry.primary}</span>
        {entry.body !== undefined && (
          <span className="text-muted-foreground line-clamp-2 w-full text-xs">{entry.body}</span>
        )}
      </SidebarMenuButton>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <SidebarMenuAction
            data-testid={`sidebar-entry-${entry.id}-remove`}
            aria-label="Remove annotation"
            showOnHover
            onPointerDown={stopPointerPropagation}
          >
            <X />
          </SidebarMenuAction>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this annotation?</AlertDialogTitle>
            <AlertDialogDescription>{removalDescription(entry.kind)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="sidebar-entry-remove-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="sidebar-entry-remove-confirm" onClick={handleConfirm}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarMenuItem>
  );
};

const EntryRow = memo(EntryRowInner);
EntryRow.displayName = "EntryRow";

interface AnnotationListProps {
  entries: AnnotationSidebarEntry[];
  onFocus: (id: string) => void;
  onRemove: (entry: AnnotationSidebarEntry) => void;
}

const AnnotationList = ({
  entries,
  onFocus,
  onRemove,
}: AnnotationListProps): React.ReactElement => {
  if (entries.length === 0) {
    return <p className="text-muted-foreground px-2 text-xs">No annotations yet.</p>;
  }
  return (
    <SidebarMenu>
      {entries.map((entry) => (
        <EntryRow key={entry.id} entry={entry} onFocus={onFocus} onRemove={onRemove} />
      ))}
    </SidebarMenu>
  );
};

interface ClearAllFooterProps {
  onClearAll: () => void;
}

const ClearAllFooter = ({ onClearAll }: ClearAllFooterProps): React.ReactElement => (
  <SidebarFooter>
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button data-testid="sidebar-clear-all" variant="outline" size="sm" className="w-full">
          <Trash2 />
          Clear all
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear all annotations?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes every comment, deletion, and global comment from the current plan. It
            can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="sidebar-clear-cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction data-testid="sidebar-clear-confirm" onClick={onClearAll}>
            Clear all
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </SidebarFooter>
);

type TabValue = "annotations" | "history";

interface DiffToggleProps {
  diffMode: SidebarDiffMode;
  onChange: (next: string) => void;
}

const DiffModeToggle = ({ diffMode, onChange }: DiffToggleProps): React.ReactElement => (
  <ToggleGroup
    type="single"
    value={diffMode}
    onValueChange={onChange}
    variant="outline"
    size="sm"
    data-testid="diff-mode-toggle"
    className="w-full"
  >
    <ToggleGroupItem
      value="clean"
      data-testid="diff-mode-clean"
      aria-label="Show only changed blocks"
      className="flex-1"
    >
      Clean
    </ToggleGroupItem>
    <ToggleGroupItem
      value="raw"
      data-testid="diff-mode-raw"
      aria-label="Show the full diff"
      className="flex-1"
    >
      Raw
    </ToggleGroupItem>
  </ToggleGroup>
);

interface HistoryPanelProps {
  versions: number[];
  activeVersion: number;
  onSelectVersion: (version: number) => void;
  showDiffToggle: boolean;
  diffMode: SidebarDiffMode;
  onDiffModeChange: (next: string) => void;
}

const HistoryPanel = ({
  versions,
  activeVersion,
  onSelectVersion,
  showDiffToggle,
  diffMode,
  onDiffModeChange,
}: HistoryPanelProps): React.ReactElement => (
  <SidebarGroup className="flex flex-col gap-2 px-2">
    {showDiffToggle && <DiffModeToggle diffMode={diffMode} onChange={onDiffModeChange} />}
    <VersionBrowser versions={versions} active={activeVersion} onSelect={onSelectVersion} />
  </SidebarGroup>
);

/**
 * Right-aligned `<Sidebar>` with two tabs: Annotations (the existing entry
 * list) and History (a `VersionBrowser` listing every persisted plan version).
 * The tab bar is hidden when only a single version exists so a fresh plan
 * keeps the single-purpose UX.
 *
 * "Clear all" only renders on the Annotations tab so a stray click can't lose
 * work while the reviewer is browsing history.
 */
export const AnnotationSidebar = ({
  entries,
  onFocus,
  onRemove,
  onClearAll,
  versions,
  activeVersion,
  onSelectVersion,
  showDiffToggle,
  diffMode,
  onDiffModeChange,
}: AnnotationSidebarProps): React.ReactElement => {
  const hasHistory = versions.length >= 2;
  const [tab, setTab] = useState<TabValue>("annotations");
  const handleTabChange = useCallback((next: string): void => {
    if (next === "annotations" || next === "history") setTab(next);
  }, []);
  const handleDiffModeChange = useCallback(
    (next: string): void => {
      if (next === "clean" || next === "raw") onDiffModeChange(next);
    },
    [onDiffModeChange]
  );
  const showClearAll = entries.length > 0 && (!hasHistory || tab === "annotations");
  return (
    <Sidebar side="right" collapsible="offcanvas" data-testid="annotation-sidebar" className="w-80">
      <SidebarHeader>
        <div className="flex items-center justify-between px-2 py-1">
          <h2 className="text-sm font-semibold">Annotations</h2>
          <Badge variant="secondary" data-testid="sidebar-total-count">
            {entries.length}
          </Badge>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {hasHistory ? (
          <Tabs value={tab} onValueChange={handleTabChange} className="flex w-full flex-col gap-2">
            <div className="px-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger data-testid="sidebar-tab-annotations" value="annotations">
                  Annotations
                </TabsTrigger>
                <TabsTrigger data-testid="sidebar-tab-history" value="history">
                  History
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="annotations">
              <SidebarGroup className="px-2">
                <AnnotationList entries={entries} onFocus={onFocus} onRemove={onRemove} />
              </SidebarGroup>
            </TabsContent>
            <TabsContent value="history">
              <HistoryPanel
                versions={versions}
                activeVersion={activeVersion}
                onSelectVersion={onSelectVersion}
                showDiffToggle={showDiffToggle}
                diffMode={diffMode}
                onDiffModeChange={handleDiffModeChange}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <SidebarGroup className="px-2">
            <AnnotationList entries={entries} onFocus={onFocus} onRemove={onRemove} />
          </SidebarGroup>
        )}
      </SidebarContent>
      {showClearAll && <ClearAllFooter onClearAll={onClearAll} />}
    </Sidebar>
  );
};
