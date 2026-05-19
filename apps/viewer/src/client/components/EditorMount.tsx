import {
  ReviewEditor,
  type EditorSnapshot,
  type ReviewEditorHandle,
} from "@symbiot/editor/components/ReviewEditor";

import { type PlanResponse } from "../../shared/apiTypes.ts";

interface EditorMountProps {
  reloadKey: number;
  plan: PlanResponse;
  initialValue: unknown[] | undefined;
  initialBodies: Map<string, string> | undefined;
  initialImages: Map<string, string[]> | undefined;
  onReady: (handle: ReviewEditorHandle) => void;
  onChange: (snapshot: EditorSnapshot) => void;
}

/**
 * Mounts `ReviewEditor` and folds `reloadKey` into `key` so Clear-All can blow
 * away editor state without remounting the parent tree.
 */
export const EditorMount = ({
  reloadKey,
  plan,
  initialValue,
  initialBodies,
  initialImages,
  onReady,
  onChange,
}: EditorMountProps): React.ReactElement => (
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
