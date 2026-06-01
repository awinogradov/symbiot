import { useCallback, useState } from "react";
import { type AnnotationComposerPayload } from "@symbiot/ui/components/AnnotationComposer";
import { type AnnotationSidebarEntry } from "@symbiot/ui/components/AnnotationSidebarTypes";

import { type ReviewState } from "./useReviewState.ts";

/** The annotation currently open in the edit composer, plus its prefilled content. */
export interface EditingAnnotation {
  entry: AnnotationSidebarEntry;
  body: string;
  images: string[];
}

/** Editing surface returned by {@link useReviewEdit}. */
export interface ReviewEdit {
  /** Open entry, or `null` when the edit composer is closed. */
  editing: EditingAnnotation | null;
  /** Open the composer for a row, snapshotting its current content for prefill. */
  onEdit: (entry: AnnotationSidebarEntry) => void;
  /** Persist the edited payload to the existing annotation and close. */
  onSave: (payload: AnnotationComposerPayload) => void;
  /** Close without saving. */
  onCancel: () => void;
}

/**
 * Owns the host-side edit-composer lifecycle: which annotation is being edited
 * and the save/cancel handlers. Snapshots `editContent(entry)` at open time so
 * the composer (remounted per entry via `key`) seeds from a stable value, and
 * routes the save back through {@link ReviewState.onUpdateAnnotation}. Kept out
 * of `ReviewScreen` so that component stays within the per-function line cap.
 */
export const useReviewEdit = (
  state: Pick<ReviewState, "editContent" | "onUpdateAnnotation">
): ReviewEdit => {
  const { editContent, onUpdateAnnotation } = state;
  const [editing, setEditing] = useState<EditingAnnotation | null>(null);

  const onEdit = useCallback(
    (entry: AnnotationSidebarEntry): void => {
      setEditing({ entry, ...editContent(entry) });
    },
    [editContent]
  );

  const onSave = useCallback(
    (payload: AnnotationComposerPayload): void => {
      if (editing === null) return;
      onUpdateAnnotation(editing.entry, payload.body, payload.images);
      setEditing(null);
    },
    [editing, onUpdateAnnotation]
  );

  const onCancel = useCallback((): void => setEditing(null), []);

  return { editing, onEdit, onSave, onCancel };
};
