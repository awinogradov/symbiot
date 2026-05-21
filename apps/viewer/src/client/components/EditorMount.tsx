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
  onReady: (handle: ReviewEditorHandle) => void;
  onChange: (snapshot: EditorSnapshot) => void;
}

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
  onReady,
  onChange,
}: EditorMountProps): React.ReactElement => {
  const isBootVersion = activeVersion === bootVersion;
  return (
    <ReviewEditor
      key={`review-${reloadKey}-${activeVersion}`}
      markdown={plan.plan}
      initialValue={isBootVersion ? initialValue : undefined}
      initialBodies={isBootVersion ? initialBodies : undefined}
      initialImages={isBootVersion ? initialImages : undefined}
      onReady={onReady}
      onChange={onChange}
    />
  );
};
