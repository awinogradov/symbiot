import {
  AnnotationComposer,
  type AnnotationComposerPayload,
} from "@symbiot/ui/components/AnnotationComposer";
import { isBodyBearingKind } from "@symbiot/ui/components/AnnotationSidebarTypes";

import { type EditingAnnotation } from "../hooks/useReviewEdit.ts";

/** Props for the host-owned edit composer. */
interface EditAnnotationComposerProps {
  /** Entry being edited, or `null` when closed. */
  editing: EditingAnnotation | null;
  onSave: (payload: AnnotationComposerPayload) => void;
  onCancel: () => void;
}

/**
 * Host-owned `AnnotationComposer` for editing an existing annotation. Distinct
 * from the editor's inline composer and the global-comment FAB — those author
 * new annotations — and naturally mutually exclusive with them via the modal
 * overlay. Remounts per entry (`key`) so the form re-seeds from the entry's
 * current body + images. Anchored kinds show their selection as the quote;
 * `global` has no anchor. Renders nothing when closed or for non-body kinds.
 */
export const EditAnnotationComposer = ({
  editing,
  onSave,
  onCancel,
}: EditAnnotationComposerProps): React.ReactElement | null => {
  if (editing === null) return null;
  const { entry, body, images } = editing;
  if (!isBodyBearingKind(entry.kind)) return null;
  return (
    <AnnotationComposer
      key={entry.id}
      kind={entry.kind}
      mode="edit"
      open
      quote={entry.kind === "global" ? undefined : entry.primary}
      initialBody={body}
      initialImages={images}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
};
