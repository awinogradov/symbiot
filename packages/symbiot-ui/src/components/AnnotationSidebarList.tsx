import { Trash2 } from "lucide-react";

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
import { EntryRow } from "./AnnotationSidebarListItem.tsx";
import { type AnnotationSidebarEntry } from "./AnnotationSidebarTypes.tsx";
import { Button } from "./Button.tsx";
import { SidebarFooter, SidebarMenu } from "./Sidebar.tsx";

/** Props for the annotation entry list. */
interface AnnotationListProps {
  entries: AnnotationSidebarEntry[];
  onFocus: (id: string) => void;
  onRemove: (entry: AnnotationSidebarEntry) => void;
}

/** Vertical list of entries with an empty state. */
export const AnnotationList = ({
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

/** Props for the bottom-of-sidebar "Clear all" trigger + confirmation. */
interface ClearAllFooterProps {
  onClearAll: () => void;
}

/** Sticky footer with a destructive confirmation dialog. */
export const ClearAllFooter = ({ onClearAll }: ClearAllFooterProps): React.ReactElement => (
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
            This removes every comment, deletion, insertion, replacement, and global comment from
            the current plan. It can&apos;t be undone.
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
