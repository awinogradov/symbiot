import { Pencil, X } from "lucide-react";
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
import {
  type AnnotationSidebarEntry,
  isBodyBearingKind,
  kindClass,
  kindLabel,
  removalDescription,
} from "./AnnotationSidebarTypes.tsx";
import { Badge } from "./Badge.tsx";
import { SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from "./SidebarMenu.tsx";

/** Props for the memoized row inside the annotation list. */
interface EntryRowProps {
  entry: AnnotationSidebarEntry;
  onFocus: (id: string) => void;
  onRemove: (entry: AnnotationSidebarEntry) => void;
  /** Open the edit composer for body-bearing kinds; never called for `deletion`. */
  onEdit: (entry: AnnotationSidebarEntry) => void;
}

const stopPointerPropagation = (event: React.PointerEvent<HTMLButtonElement>): void => {
  event.stopPropagation();
};

// Reserve trailing room for the hover actions: one slot (remove) for non-editable
// rows, two (edit + remove) for body-bearing rows.
const rowClassName = (editable: boolean): string =>
  cn(
    "group-hover/menu-item:bg-sidebar-accent group-hover/menu-item:text-sidebar-accent-foreground flex h-auto flex-col items-start gap-1 py-2",
    editable ? "pr-16" : "pr-9"
  );

const EntryRowInner = ({ entry, onFocus, onRemove, onEdit }: EntryRowProps): React.ReactElement => {
  const handleClick = useCallback((): void => onFocus(entry.id), [entry.id, onFocus]);
  const handleConfirm = useCallback((): void => onRemove(entry), [entry, onRemove]);
  const handleEdit = useCallback((): void => onEdit(entry), [entry, onEdit]);
  const editable = isBodyBearingKind(entry.kind);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        data-testid={`sidebar-entry-${entry.id}`}
        data-kind={entry.kind}
        onClick={handleClick}
        size="lg"
        className={rowClassName(editable)}
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
      {editable && (
        <SidebarMenuAction
          data-testid={`sidebar-entry-${entry.id}-edit`}
          aria-label="Edit annotation"
          showOnHover
          className="right-9"
          onPointerDown={stopPointerPropagation}
          onClick={handleEdit}
        >
          <Pencil />
        </SidebarMenuAction>
      )}
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

/** Memoized list row for a single annotation entry. */
export const EntryRow = memo(EntryRowInner);
EntryRow.displayName = "EntryRow";
