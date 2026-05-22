import {
  ReviewEditor,
  type EditorSnapshot,
  type ReviewEditorHandle,
} from "@symbiot/editor/components/ReviewEditor";

import { type PlanResponse } from "../../shared/apiTypes.ts";

/** Props passed to {@link EditorMount} from `ReviewScreen`. */
interface EditorMountProps {
  /** Bumped by Clear-All to force a fresh Plate editor mount. */
  reloadKey: number;
  /** Version number currently rendered; folded into the editor key so a switch remounts. */
  activeVersion: number;
  /** Version the session booted with — draft hydration is gated on this matching `activeVersion`. */
  bootVersion: number;
  /** Plan response whose markdown drives the editor's initial value. */
  plan: PlanResponse;
  initialValue: unknown[] | undefined;
  initialBodies: Map<string, string> | undefined;
  initialImages: Map<string, string[]> | undefined;
  initialCommentOriginalTexts: Map<string, string> | undefined;
  initialSuggestionOriginalTexts: Map<string, string> | undefined;
  initialInsertionNewTexts: Map<string, string> | undefined;
  initialInsertionImages: Map<string, string[]> | undefined;
  initialInsertionOriginalTexts: Map<string, string> | undefined;
  initialReplacementTexts: Map<string, string> | undefined;
  initialReplacementImages: Map<string, string[]> | undefined;
  initialReplacementOriginalTexts: Map<string, string> | undefined;
  /** Receives the editor handle once Plate is constructed. */
  onReady: (handle: ReviewEditorHandle) => void;
  /** Fires on every Plate editor change with a serializable snapshot. */
  onChange: (snapshot: EditorSnapshot) => void;
}

/** Input to {@link gatedHydration}: full hydration slice + the gate flag. */
interface GatedHydrationInput {
  /** When `false`, every hydration field collapses to `undefined`. */
  isBootVersion: boolean;
  initialValue: unknown[] | undefined;
  initialBodies: Map<string, string> | undefined;
  initialImages: Map<string, string[]> | undefined;
  initialCommentOriginalTexts: Map<string, string> | undefined;
  initialSuggestionOriginalTexts: Map<string, string> | undefined;
  initialInsertionNewTexts: Map<string, string> | undefined;
  initialInsertionImages: Map<string, string[]> | undefined;
  initialInsertionOriginalTexts: Map<string, string> | undefined;
  initialReplacementTexts: Map<string, string> | undefined;
  initialReplacementImages: Map<string, string[]> | undefined;
  initialReplacementOriginalTexts: Map<string, string> | undefined;
}

/** Hydration slice forwarded to `ReviewEditor` — same shape as the input, minus the gate flag. */
interface GatedHydrationOutput {
  initialValue: unknown[] | undefined;
  initialBodies: Map<string, string> | undefined;
  initialImages: Map<string, string[]> | undefined;
  initialCommentOriginalTexts: Map<string, string> | undefined;
  initialSuggestionOriginalTexts: Map<string, string> | undefined;
  initialInsertionNewTexts: Map<string, string> | undefined;
  initialInsertionImages: Map<string, string[]> | undefined;
  initialInsertionOriginalTexts: Map<string, string> | undefined;
  initialReplacementTexts: Map<string, string> | undefined;
  initialReplacementImages: Map<string, string[]> | undefined;
  initialReplacementOriginalTexts: Map<string, string> | undefined;
}

/**
 * When the reviewer is browsing a historical version, none of the boot
 * version's draft state should hydrate the editor (the marks would anchor
 * onto unrelated text). Returns the props verbatim on the boot version, all
 * `undefined` otherwise.
 */
const gatedHydration = (input: GatedHydrationInput): GatedHydrationOutput => {
  if (!input.isBootVersion) {
    return {
      initialValue: undefined,
      initialBodies: undefined,
      initialImages: undefined,
      initialCommentOriginalTexts: undefined,
      initialSuggestionOriginalTexts: undefined,
      initialInsertionNewTexts: undefined,
      initialInsertionImages: undefined,
      initialInsertionOriginalTexts: undefined,
      initialReplacementTexts: undefined,
      initialReplacementImages: undefined,
      initialReplacementOriginalTexts: undefined,
    };
  }
  return {
    initialValue: input.initialValue,
    initialBodies: input.initialBodies,
    initialImages: input.initialImages,
    initialCommentOriginalTexts: input.initialCommentOriginalTexts,
    initialSuggestionOriginalTexts: input.initialSuggestionOriginalTexts,
    initialInsertionNewTexts: input.initialInsertionNewTexts,
    initialInsertionImages: input.initialInsertionImages,
    initialInsertionOriginalTexts: input.initialInsertionOriginalTexts,
    initialReplacementTexts: input.initialReplacementTexts,
    initialReplacementImages: input.initialReplacementImages,
    initialReplacementOriginalTexts: input.initialReplacementOriginalTexts,
  };
};

/**
 * Mounts `ReviewEditor` and folds `reloadKey` + `activeVersion` into `key` so
 * Clear-All and version switches both blow away editor state without remounting
 * the parent tree. Draft hydration is suppressed when the reviewer browses a
 * non-boot version so prior-version marks don't anchor onto unrelated text.
 */
export const EditorMount = ({
  reloadKey,
  activeVersion,
  bootVersion,
  plan,
  initialValue,
  initialBodies,
  initialImages,
  initialCommentOriginalTexts,
  initialSuggestionOriginalTexts,
  initialInsertionNewTexts,
  initialInsertionImages,
  initialInsertionOriginalTexts,
  initialReplacementTexts,
  initialReplacementImages,
  initialReplacementOriginalTexts,
  onReady,
  onChange,
}: EditorMountProps): React.ReactElement => {
  const hydration = gatedHydration({
    isBootVersion: activeVersion === bootVersion,
    initialValue,
    initialBodies,
    initialImages,
    initialCommentOriginalTexts,
    initialSuggestionOriginalTexts,
    initialInsertionNewTexts,
    initialInsertionImages,
    initialInsertionOriginalTexts,
    initialReplacementTexts,
    initialReplacementImages,
    initialReplacementOriginalTexts,
  });
  return (
    <ReviewEditor
      key={`review-${reloadKey}-${activeVersion}`}
      markdown={plan.plan}
      {...hydration}
      onReady={onReady}
      onChange={onChange}
    />
  );
};
