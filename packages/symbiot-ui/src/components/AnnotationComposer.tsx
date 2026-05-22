import { useCallback } from "react";

import { ComposerForm, type ComposerPayload } from "./ComposerForm.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./Dialog.tsx";

/** Payload the host receives when the composer saves. */
export type AnnotationComposerPayload = ComposerPayload;

/**
 * Kinds the composer dialog supports. Selection-anchored kinds (`comment` /
 * `insertion` / `replacement`) render a quote block above the textarea; the
 * top-bar `global` kind has no anchor and so omits the quote.
 */
export type AnnotationComposerKind = "comment" | "insertion" | "replacement" | "global";

interface KindSurface {
  title: string;
  description: string;
  placeholder: string;
  /** Tailwind class applied to the anchored quote block; ignored when `global`. */
  quoteClass: string;
  /** Per-kind test ids so existing Playwright selectors keep resolving. */
  testIds: {
    /** Wraps the dialog content. */
    composer: string;
    /** Reused by `ComposerForm` for textarea / cancel / save buttons. */
    form: { textarea: string; cancel: string; save: string };
  };
}

const kindSurface: Record<AnnotationComposerKind, KindSurface> = {
  comment: {
    title: "Comment on selection",
    description: "Add a comment to the selected text.",
    placeholder: "Comment on this selection… (Enter to save, Esc to cancel)",
    quoteClass: "border-anno-comment text-anno-comment bg-anno-comment/10",
    testIds: {
      composer: "annotation-composer",
      form: { textarea: "composer-textarea", cancel: "composer-cancel", save: "composer-save" },
    },
  },
  insertion: {
    title: "Insert after selection",
    description: "Type the text you want to insert after the selection.",
    placeholder: "Insert text after this selection… (Enter to save, Esc to cancel)",
    quoteClass: "border-anno-insert text-anno-insert bg-anno-insert/10",
    testIds: {
      composer: "annotation-composer",
      form: { textarea: "composer-textarea", cancel: "composer-cancel", save: "composer-save" },
    },
  },
  replacement: {
    title: "Replace selection",
    description: "Type the text you want to substitute for the selection.",
    placeholder: "Replace this selection with… (Enter to save, Esc to cancel)",
    quoteClass: "border-anno-replace text-anno-replace bg-anno-replace/10",
    testIds: {
      composer: "annotation-composer",
      form: { textarea: "composer-textarea", cancel: "composer-cancel", save: "composer-save" },
    },
  },
  global: {
    title: "Global comment",
    description: "Leave feedback that isn't tied to a selection.",
    placeholder: "Global feedback on the plan… (Enter to save, Esc to cancel)",
    quoteClass: "",
    testIds: {
      composer: "global-comment-composer",
      form: {
        textarea: "global-composer-textarea",
        cancel: "global-composer-cancel",
        save: "global-composer-save",
      },
    },
  },
};

interface AnnotationComposerProps {
  /** Which authoring surface to render. `global` omits the quote block. */
  kind: AnnotationComposerKind;
  open: boolean;
  /** Selected text rendered as a quote above the textarea. Required unless `kind === "global"`. */
  quote?: string;
  onSave: (payload: AnnotationComposerPayload) => void;
  onCancel: () => void;
}

/**
 * Modal Dialog that captures a body + optional images either anchored to a
 * text selection (`kind`: `comment` / `insertion` / `replacement`) or floating
 * via the top-bar FAB (`kind`: `global`). Polymorphic over `kind` so the same
 * composer drives both selection-anchored and global-comment authoring; per-
 * kind testids keep existing Playwright selectors stable.
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

  const showQuote = kind !== "global" && typeof quote === "string";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid={surface.testIds.composer}
        data-kind={kind}
        className="sm:max-w-2xl"
      >
        <DialogHeader className={kind === "global" ? undefined : "sr-only"}>
          <DialogTitle>{surface.title}</DialogTitle>
          <DialogDescription>{surface.description}</DialogDescription>
        </DialogHeader>
        {showQuote ? (
          <blockquote
            data-testid="composer-quote"
            className={`line-clamp-4 rounded-sm border-l-2 py-1 pl-3 text-sm whitespace-pre-wrap italic ${surface.quoteClass}`}
          >
            {quote}
          </blockquote>
        ) : null}
        <ComposerForm
          open={open}
          placeholder={surface.placeholder}
          onSave={onSave}
          onCancel={onCancel}
          testId={surface.testIds.form}
        />
      </DialogContent>
    </Dialog>
  );
};
