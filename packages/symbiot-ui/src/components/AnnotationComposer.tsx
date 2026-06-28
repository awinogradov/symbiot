import { useCallback, useRef } from "react";

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
  /** Title shown when reopening the composer to edit an existing annotation. */
  editTitle: string;
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
    editTitle: "Edit comment",
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
    editTitle: "Edit insertion",
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
    editTitle: "Edit replacement",
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
    editTitle: "Edit global comment",
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

/**
 * Whether the composer is authoring a new annotation (`create`) or editing an
 * existing one (`edit`). Edit mode swaps in the per-kind {@link KindSurface.editTitle}
 * and surfaces a visible header so the reviewer knows they are changing an
 * existing note rather than adding one.
 */
export type AnnotationComposerMode = "create" | "edit";

/**
 * Resolve the dialog header for a kind + mode: edit mode shows the edit title
 * and an always-visible header; the anchored create surfaces hide their header
 * (the quote carries the context) while `global` keeps it.
 */
const headerFor = (
  surface: KindSurface,
  kind: AnnotationComposerKind,
  mode: AnnotationComposerMode
): { title: string; hidden: boolean } => {
  const isEdit = mode === "edit";
  return {
    title: isEdit ? surface.editTitle : surface.title,
    hidden: !isEdit && kind !== "global",
  };
};

interface AnnotationComposerProps {
  /** Which authoring surface to render. `global` omits the quote block. */
  kind: AnnotationComposerKind;
  open: boolean;
  /** Authoring vs. editing an existing annotation. Defaults to `create`. */
  mode?: AnnotationComposerMode;
  /** Selected text rendered as a quote above the textarea. Required unless `kind === "global"`. */
  quote?: string;
  /** Seeds the body when `mode === "edit"`; forwarded to `ComposerForm` and read once at mount. */
  initialBody?: string;
  /** Seeds the attached images when `mode === "edit"`; read once at mount. */
  initialImages?: AnnotationComposerPayload["images"];
  onSave: (payload: AnnotationComposerPayload) => void;
  onCancel: () => void;
}

/**
 * Modal Dialog that captures a body + optional images either anchored to a
 * text selection (`kind`: `comment` / `insertion` / `replacement`) or floating
 * via the top-bar FAB (`kind`: `global`). Polymorphic over `kind` so the same
 * composer drives both selection-anchored and global-comment authoring; per-
 * kind testids keep existing Playwright selectors stable, while `data-mode`
 * lets edit-mode hosts target the reused dialog without new testids.
 */
export const AnnotationComposer = ({
  kind,
  open,
  mode = "create",
  quote,
  initialBody,
  initialImages,
  onSave,
  onCancel,
}: AnnotationComposerProps): React.ReactElement => {
  const surface = kindSurface[kind];
  // The overlay-dismiss route arms this ref (via onPointerDownOutside); onCloseAutoFocus then
  // skips Radix's focus-restoration for THAT route only, removing the async re-focus that races
  // the eager-mark rollback and orphans the highlight in the blurred read-only editor. Cancel and
  // Escape never arm it, so they keep Radix's default focus return unchanged (symbiot#236).
  const dismissedViaOverlayRef = useRef(false);
  const onOpenChange = useCallback(
    (next: boolean): void => {
      if (!next) onCancel();
    },
    [onCancel]
  );
  const onPointerDownOutside = useCallback((): void => {
    dismissedViaOverlayRef.current = true;
  }, []);
  const onCloseAutoFocus = useCallback((event: Event): void => {
    if (dismissedViaOverlayRef.current) event.preventDefault();
    dismissedViaOverlayRef.current = false;
  }, []);

  const showQuote = kind !== "global" && typeof quote === "string";
  const header = headerFor(surface, kind, mode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid={surface.testIds.composer}
        data-kind={kind}
        data-mode={mode}
        className="sm:max-w-2xl"
        onPointerDownOutside={onPointerDownOutside}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader className={header.hidden ? "sr-only" : undefined}>
          <DialogTitle>{header.title}</DialogTitle>
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
          initialBody={initialBody}
          initialImages={initialImages}
        />
      </DialogContent>
    </Dialog>
  );
};
