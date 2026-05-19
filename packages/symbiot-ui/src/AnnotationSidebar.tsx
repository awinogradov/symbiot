import { useCallback, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./components/AlertDialog.tsx";
import { Badge } from "./components/Badge.tsx";
import { Button } from "./components/Button.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/Tabs.tsx";

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

interface EntryCardProps {
  entry: AnnotationSidebarEntry;
  onFocus: (id: string) => void;
}

const EntryCard = ({ entry, onFocus }: EntryCardProps): React.ReactElement => (
  <button
    type="button"
    data-testid={`sidebar-entry-${entry.id}`}
    data-kind={entry.kind}
    onClick={(): void => onFocus(entry.id)}
    className="border-border bg-card hover:bg-accent flex w-full flex-col gap-1 rounded-md border p-3 text-left text-sm transition-colors"
  >
    <div className="text-muted-foreground flex items-center justify-between text-xs">
      <span>{kindLabel(entry.kind)}</span>
      {entry.lines !== undefined && (
        <span>
          lines {entry.lines.startLine}–{entry.lines.endLine}
        </span>
      )}
    </div>
    <span className="line-clamp-2 font-medium">{entry.primary}</span>
    {entry.body !== undefined && (
      <span className="text-muted-foreground line-clamp-2 text-xs">{entry.body}</span>
    )}
  </button>
);

const counts = (entries: AnnotationSidebarEntry[]): Record<Tab, number> => ({
  all: entries.length,
  comment: entries.filter((e) => e.kind === "comment").length,
  deletion: entries.filter((e) => e.kind === "deletion").length,
  global: entries.filter((e) => e.kind === "global").length,
});

const TABS: Tab[] = ["all", "comment", "deletion", "global"];

/**
 * Right-aligned panel listing all annotations on the current plan. Click an
 * entry → `onFocus(id)` (host scrolls to the marked DOM range via `data-anno-id`).
 * "Clear all" gate behind an AlertDialog so a stray click can't lose work.
 */
export const AnnotationSidebar = ({
  entries,
  onFocus,
  onClearAll,
}: AnnotationSidebarProps): React.ReactElement => {
  const [tab, setTab] = useState<Tab>("all");
  const c = counts(entries);
  const filtered = tabFilter(entries, tab);

  const onTabChange = useCallback((value: string): void => {
    setTab(value as Tab);
  }, []);

  return (
    <Sidebar>
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Annotations</h2>
        <Badge variant="secondary" data-testid="sidebar-total-count">
          {c.all}
        </Badge>
      </div>
      <Tabs value={tab} onValueChange={onTabChange} className="flex flex-1 flex-col">
        <TabsList className="mx-3 mt-3">
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t} data-testid={`sidebar-tab-${t}`}>
              {tabLabel(t)}
              <Badge variant="outline" className="ml-1.5">
                {c[t]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-xs">No {tabLabel(tab).toLowerCase()} yet.</p>
          ) : (
            filtered.map((entry) => <EntryCard key={entry.id} entry={entry} onFocus={onFocus} />)
          )}
        </TabsContent>
      </Tabs>
      <div className="border-border border-t p-3">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              data-testid="sidebar-clear-all"
              variant="outline"
              className="w-full"
              disabled={c.all === 0}
            >
              Clear all
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Clear all annotations?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes every comment, deletion, and global comment from the current plan. It
              can&apos;t be undone.
            </AlertDialogDescription>
            <div className="mt-4 flex justify-end gap-2">
              <AlertDialogCancel asChild>
                <Button variant="ghost" data-testid="sidebar-clear-cancel">
                  Cancel
                </Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button data-testid="sidebar-clear-confirm" onClick={onClearAll}>
                  Clear all
                </Button>
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Sidebar>
  );
};
