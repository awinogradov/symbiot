import { useCallback } from "react";

import { ComposerForm, type ComposerPayload } from "./ComposerForm.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./Dialog.tsx";

/** Payload the host receives when the composer saves. */
export type AnnotationComposerPayload = ComposerPayload;

/**
 * Kinds that author a body via the popover composer. Deletion authoring has
 * no body and therefore no composer.
 */
export type AnnotationComposerKind = "comment" | "insertion";

interface KindSurface {
  title: string;
  description: string;
  placeholder: string;
  quoteClass: string;
}

const kindSurface: Record<AnnotationComposerKind, KindSurface> = {
  comment: {
    title: "Comment on selection",
    description: "Add a comment to the selected text.",
    placeholder: "Comment on this selection… (Enter to save, Esc to cancel)",
    quoteClass: "border-anno-comment text-anno-comment bg-anno-comment/10",
  },
  insertion: {
    title: "Insert after selection",
    description: "Type the text you want to insert after the selection.",
    placeholder: "Insert text after this selection… (Enter to save, Esc to cancel)",
    quoteClass: "border-anno-insert text-anno-insert bg-anno-insert/10",
  },
};

interface AnnotationComposerProps {
  kind: AnnotationComposerKind;
  open: boolean;
  /** Selected text rendered as a quote above the textarea. */
  quote: string;
  onSave: (payload: AnnotationComposerPayload) => void;
  onCancel: () => void;
}

/**
 * Modal Dialog that captures a body + optional images anchored to a text
 * selection. Polymorphic over `kind` — the same composer drives both Comment
 * authoring and Insertion authoring (Phase 5.2). Testids stay stable across
 * kinds so only one composer is open at a time.
 */
export const AnnotationComposer = ({
  kind,
  open,
  quote,
  onSave,
  onCancel,
}: AnnotationComposerProps): React.ReactElement => {
  const surface = kindSurface[kind];
  const onOpenChange = useCallback(
    (next: boolean): void => {
      if (!next) onCancel();
    },
    [onCancel]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="annotation-composer" data-kind={kind} className="sm:max-w-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{surface.title}</DialogTitle>
          <DialogDescription>{surface.description}</DialogDescription>
        </DialogHeader>
        <blockquote
          data-testid="composer-quote"
          className={`line-clamp-4 rounded-sm border-l-2 py-1 pl-3 text-sm whitespace-pre-wrap italic ${surface.quoteClass}`}
        >
          {quote}
        </blockquote>
        <ComposerForm
          open={open}
          placeholder={surface.placeholder}
          onSave={onSave}
          onCancel={onCancel}
          testId={{
            textarea: "composer-textarea",
            cancel: "composer-cancel",
            save: "composer-save",
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
