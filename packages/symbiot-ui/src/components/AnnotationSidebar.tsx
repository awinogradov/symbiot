import { Trash2 } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";

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
  SidebarMenuButton,
  SidebarMenuItem,
} from "./Sidebar.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs.tsx";

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
}

type Tab = "all" | "comment" | "deletion" | "global";

interface AnnotationSidebarProps {
  entries: AnnotationSidebarEntry[];
  onFocus: (id: string) => void;
  onClearAll: () => void;
}

const tabFilter = (entries: AnnotationSidebarEntry[], tab: Tab): AnnotationSidebarEntry[] =>
  tab === "all" ? entries : entries.filter((e) => e.kind === tab);

const tabLabel = (kind: Tab): string => {
  switch (kind) {
    case "all":
      return "All";
    case "comment":
      return "Comments";
    case "deletion":
      return "Deletions";
    case "global":
      return "Global";
  }
};

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

interface EntryRowProps {
  entry: AnnotationSidebarEntry;
  onFocus: (id: string) => void;
}

const EntryRowInner = ({ entry, onFocus }: EntryRowProps): React.ReactElement => {
  const handleClick = useCallback((): void => onFocus(entry.id), [entry.id, onFocus]);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        data-testid={`sidebar-entry-${entry.id}`}
        data-kind={entry.kind}
        onClick={handleClick}
        size="lg"
        className="flex h-auto flex-col items-start gap-1 py-2"
      >
        <div className="text-muted-foreground flex w-full items-center justify-between text-xs">
          <span>{kindLabel(entry.kind)}</span>
          {entry.lines !== undefined && (
            <span>
              lines {entry.lines.startLine}–{entry.lines.endLine}
            </span>
          )}
        </div>
        <span className="line-clamp-2 w-full text-sm font-medium">{entry.primary}</span>
        {entry.body !== undefined && (
          <span className="text-muted-foreground line-clamp-2 w-full text-xs">{entry.body}</span>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const EntryRow = memo(EntryRowInner);
EntryRow.displayName = "EntryRow";

const countByKind = (entries: AnnotationSidebarEntry[]): Record<Tab, number> => {
  const out: Record<Tab, number> = { all: entries.length, comment: 0, deletion: 0, global: 0 };
  for (const e of entries) out[e.kind] += 1;
  return out;
};

const TABS: Tab[] = ["all", "comment", "deletion", "global"];

/**
 * Right-aligned `<Sidebar>` listing all annotations on the current plan. Click
 * an entry → `onFocus(id)` (host scrolls to the marked DOM range via
 * `data-anno-id`). "Clear all" gates behind an AlertDialog so a stray click
 * can't lose work.
 */
export const AnnotationSidebar = ({
  entries,
  onFocus,
  onClearAll,
}: AnnotationSidebarProps): React.ReactElement => {
  const [tab, setTab] = useState<Tab>("all");
  const c = useMemo(() => countByKind(entries), [entries]);
  const filtered = useMemo(() => tabFilter(entries, tab), [entries, tab]);

  const onTabChange = useCallback((value: string): void => {
    setTab(value as Tab);
  }, []);

  return (
    <Sidebar side="right" collapsible="offcanvas" data-testid="annotation-sidebar" className="w-80">
      <SidebarHeader>
        <div className="flex items-center justify-between px-2 py-1">
          <h2 className="text-sm font-semibold">Annotations</h2>
          <Badge variant="secondary" data-testid="sidebar-total-count">
            {c.all}
          </Badge>
        </div>
        <Tabs value={tab} onValueChange={onTabChange} className="px-2">
          <TabsList className="w-full">
            {TABS.map((t) => (
              <TabsTrigger key={t} value={t} data-testid={`sidebar-tab-${t}`} className="flex-1">
                {tabLabel(t)}
                <Badge variant="outline" className="ml-1.5">
                  {c[t]}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </SidebarHeader>
      <SidebarContent>
        <Tabs value={tab} onValueChange={onTabChange} className="flex flex-1 flex-col">
          <TabsContent value={tab} className="flex-1 px-2">
            <SidebarGroup>
              {filtered.length === 0 ? (
                <p className="text-muted-foreground px-2 text-xs">
                  No {tabLabel(tab).toLowerCase()} yet.
                </p>
              ) : (
                <SidebarMenu>
                  {filtered.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} onFocus={onFocus} />
                  ))}
                </SidebarMenu>
              )}
            </SidebarGroup>
          </TabsContent>
        </Tabs>
      </SidebarContent>
      <SidebarFooter>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              data-testid="sidebar-clear-all"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={c.all === 0}
            >
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
    </Sidebar>
  );
};
