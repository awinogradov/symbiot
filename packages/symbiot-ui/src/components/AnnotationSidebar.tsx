import { Trash2, X } from "lucide-react";
import { memo, useCallback } from "react";

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

interface AnnotationSidebarProps {
  entries: AnnotationSidebarEntry[];
  onFocus: (id: string) => void;
  onRemove: (entry: AnnotationSidebarEntry) => void;
  onClearAll: () => void;
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
        <div className="text-muted-foreground flex w-full items-center justify-between text-xs">
          <span className={cn("font-medium", kindClass(entry.kind))}>{kindLabel(entry.kind)}</span>
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

/**
 * Right-aligned `<Sidebar>` listing all annotations on the current plan. Click
 * an entry → `onFocus(id)` (host scrolls to the marked DOM range via
 * `data-anno-id`). "Clear all" gates behind an AlertDialog so a stray click
 * can't lose work.
 */
export const AnnotationSidebar = ({
  entries,
  onFocus,
  onRemove,
  onClearAll,
}: AnnotationSidebarProps): React.ReactElement => {
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
        <SidebarGroup className="px-2">
          {entries.length === 0 ? (
            <p className="text-muted-foreground px-2 text-xs">No annotations yet.</p>
          ) : (
            <SidebarMenu>
              {entries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} onFocus={onFocus} onRemove={onRemove} />
              ))}
            </SidebarMenu>
          )}
        </SidebarGroup>
      </SidebarContent>
      {entries.length > 0 && (
        <SidebarFooter>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                data-testid="sidebar-clear-all"
                variant="outline"
                size="sm"
                className="w-full"
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
      )}
    </Sidebar>
  );
};
