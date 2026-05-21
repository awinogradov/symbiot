import {
  ReviewEditor,
  type EditorSnapshot,
  type ReviewEditorHandle,
} from "@symbiot/editor/components/ReviewEditor";

import { type PlanResponse } from "../../shared/apiTypes.ts";

interface EditorMountProps {
  reloadKey: number;
  /** Version number currently rendered; folded into the editor key so a switch remounts. */
  activeVersion: number;
  /** Version the session booted with — draft hydration is gated on this matching `activeVersion`. */
  bootVersion: number;
  plan: PlanResponse;
  initialValue: unknown[] | undefined;
  initialBodies: Map<string, string> | undefined;
  initialImages: Map<string, string[]> | undefined;
  initialCommentOriginalTexts: Map<string, string> | undefined;
  initialSuggestionOriginalTexts: Map<string, string> | undefined;
  onReady: (handle: ReviewEditorHandle) => void;
  onChange: (snapshot: EditorSnapshot) => void;
}

/**
 * Mounts `ReviewEditor` and folds `reloadKey` + `activeVersion` into `key` so
 * Clear-All and version switches both blow away editor state without remounting
 * the parent tree. Draft hydration is suppressed when the reviewer browses a
 * non-boot version so prior-version marks don't anchor onto unrelated text.
 */
/**
 * When the reviewer is browsing a historical version, none of the boot
 * version's draft state should hydrate the editor (the marks would anchor
 * onto unrelated text). Returns the props verbatim on the boot version, all
 * `undefined` otherwise.
 */
const gatedHydration = (
  isBootVersion: boolean,
  initialValue: unknown[] | undefined,
  initialBodies: Map<string, string> | undefined,
  initialImages: Map<string, string[]> | undefined,
  initialCommentOriginalTexts: Map<string, string> | undefined,
  initialSuggestionOriginalTexts: Map<string, string> | undefined
): {
  initialValue: unknown[] | undefined;
  initialBodies: Map<string, string> | undefined;
  initialImages: Map<string, string[]> | undefined;
  initialCommentOriginalTexts: Map<string, string> | undefined;
  initialSuggestionOriginalTexts: Map<string, string> | undefined;
} => {
  if (!isBootVersion) {
    return {
      initialValue: undefined,
      initialBodies: undefined,
      initialImages: undefined,
      initialCommentOriginalTexts: undefined,
      initialSuggestionOriginalTexts: undefined,
    };
  }
  return {
    initialValue,
    initialBodies,
    initialImages,
    initialCommentOriginalTexts,
    initialSuggestionOriginalTexts,
  };
};

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
  onReady,
  onChange,
}: EditorMountProps): React.ReactElement => {
  const hydration = gatedHydration(
    activeVersion === bootVersion,
    initialValue,
    initialBodies,
    initialImages,
    initialCommentOriginalTexts,
    initialSuggestionOriginalTexts
  );
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
