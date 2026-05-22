/**
 * Keyboard shortcut bindings for the plan-review surface.
 *
 * The hook stays passive — it does not own any UI state. The host wires its
 * existing approve / submit / open-global-comment callbacks plus the editor
 * handle, and the hook routes the shortcut events to them. Gating mirrors the
 * UI: hotkeys are silent during submission, on historical/diff overlays, and
 * while the user is typing inside form inputs (the composer textarea handles
 * its own Enter/Esc semantics).
 */

import { useHotkeys } from "react-hotkeys-hook";
import { type ReviewEditorHandle } from "@symbiot/editor/components/ReviewEditor";

import { type ViewerMode } from "../../shared/apiTypes.ts";

/** Submission lifecycle phase the host passes in (mirrors `useReviewSubmit`). */
type Phase = "ready" | "submitting" | "done";

/** Inputs required to wire the review hotkeys. */
export interface ReviewHotkeysDeps {
  phase: Phase;
  mode: ViewerMode;
  /** Mirrors the TopBar `Actions` switch: when true, the deny/submit button is active instead of approve. */
  hasAnnotations: boolean;
  /** True when the visible pane is a historical/diff overlay — no editing actions are valid. */
  inReadOnlyView: boolean;
  /** True while any annotation composer dialog is open. Suppresses all hotkeys so a stray Mod+Enter from a focused button inside the dialog can't submit. */
  composerOpen: boolean;
  /** Imperative handle from `<ReviewEditor>`. Null until the editor mounts. */
  editorHandle: ReviewEditorHandle | null;
  onApprove: () => void;
  onSubmit: () => void;
  onOpenGlobalComment: () => void;
}

const sharedOptions = {
  enableOnFormTags: false,
  enableOnContentEditable: false,
  preventDefault: true,
} as const;

/**
 * Defence-in-depth check for any open Radix dialog. Used alongside the
 * `composerOpen` prop so non-tracked dialogs (e.g. SettingsDialog) also
 * suppress hotkeys. Radix Dialog sets `data-state="open"` while mounted.
 */
const isAnyDialogOpen = (): boolean => {
  if (typeof document === "undefined") return false;
  return document.querySelector('[role="dialog"][data-state="open"]') !== null;
};

/**
 * Route the `c` hotkey: inline comment when the editor has a non-empty
 * selection, global comment composer otherwise. Extracted so the hotkey
 * callback stays under the cyclomatic-complexity cap.
 */
const dispatchCommentHotkey = (
  editorHandle: ReviewEditorHandle | null,
  onOpenGlobalComment: () => void
): void => {
  if (editorHandle?.hasValidSelection() === true) {
    editorHandle.triggerAnnotation("comment");
    return;
  }
  onOpenGlobalComment();
};

/**
 * Bind the plan-review keyboard shortcuts:
 *
 * - `mod+enter` → approve (no annotations yet) or submit (annotations queued).
 * - `c` → inline comment on the current selection; otherwise opens the global
 *   comment composer.
 * - `i` / `r` / `d` → insertion / replacement / deletion on the current
 *   selection. No-op when no selection is active (matches the toolbar buttons).
 */
export const useReviewHotkeys = ({
  phase,
  mode,
  hasAnnotations,
  inReadOnlyView,
  composerOpen,
  editorHandle,
  onApprove,
  onSubmit,
  onOpenGlobalComment,
}: ReviewHotkeysDeps): void => {
  const submitEnabled = phase === "ready" && !inReadOnlyView && !composerOpen;
  const annotationsEnabled = submitEnabled && editorHandle !== null;
  const useApprove = mode === "plan" && !hasAnnotations;

  useHotkeys(
    "mod+enter",
    () => {
      if (isAnyDialogOpen()) return;
      if (useApprove) onApprove();
      else onSubmit();
    },
    { ...sharedOptions, enabled: submitEnabled },
    [useApprove, onApprove, onSubmit]
  );

  const onCommentHotkey = (): void => {
    if (isAnyDialogOpen()) return;
    dispatchCommentHotkey(editorHandle, onOpenGlobalComment);
  };

  useHotkeys("c", onCommentHotkey, { ...sharedOptions, enabled: annotationsEnabled }, [
    editorHandle,
    onOpenGlobalComment,
  ]);

  useHotkeys(
    "i",
    () => {
      if (isAnyDialogOpen()) return;
      editorHandle?.triggerAnnotation("insertion");
    },
    { ...sharedOptions, enabled: annotationsEnabled },
    [editorHandle]
  );

  useHotkeys(
    "r",
    () => {
      if (isAnyDialogOpen()) return;
      editorHandle?.triggerAnnotation("replacement");
    },
    { ...sharedOptions, enabled: annotationsEnabled },
    [editorHandle]
  );

  useHotkeys(
    "d",
    () => {
      if (isAnyDialogOpen()) return;
      editorHandle?.triggerAnnotation("deletion");
    },
    { ...sharedOptions, enabled: annotationsEnabled },
    [editorHandle]
  );
};
