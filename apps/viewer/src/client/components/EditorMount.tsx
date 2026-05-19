import { RedlineEditor } from "@symbiot/editor/components/RedlineEditor";
import {
  ReviewEditor,
  type EditorSnapshot,
  type ReviewEditorHandle,
} from "@symbiot/editor/components/ReviewEditor";
import { type EditorMode } from "@symbiot/ui/components/TopBar";

import { type PlanResponse } from "../libs/api.ts";

interface EditorMountProps {
  editorMode: EditorMode;
  reloadKey: number;
  plan: PlanResponse;
  initialValue: unknown[] | undefined;
  initialBodies: Map<string, string> | undefined;
  initialImages: Map<string, string[]> | undefined;
  onReady: (handle: ReviewEditorHandle) => void;
  onChange: (snapshot: EditorSnapshot) => void;
}

/**
 * Selects `ReviewEditor` or `RedlineEditor` for the current `editorMode`.
 * Both share the same props surface; the `reloadKey` is folded into `key` so
 * Clear-All can blow away editor state without remounting the parent tree.
 */
export const EditorMount = ({
  editorMode,
  reloadKey,
  plan,
  initialValue,
  initialBodies,
  initialImages,
  onReady,
  onChange,
}: EditorMountProps): React.ReactElement => {
  if (editorMode === "review") {
    return (
      <ReviewEditor
        key={`review-${reloadKey}`}
        markdown={plan.plan}
        initialValue={initialValue}
        initialBodies={initialBodies}
        initialImages={initialImages}
        onReady={onReady}
        onChange={onChange}
      />
    );
  }
  return (
    <RedlineEditor
      key={`redline-${reloadKey}`}
      markdown={plan.plan}
      initialValue={initialValue}
      initialBodies={initialBodies}
      initialImages={initialImages}
      onReady={onReady}
      onChange={onChange}
    />
  );
};
