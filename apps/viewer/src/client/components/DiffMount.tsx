import { DiffEditor, type DiffMode } from "@symbiot/editor/components/DiffEditor";

interface DiffMountProps {
  current: string;
  previous: string;
  /** Version number of `current` — folded into the editor key so version switches force a remount. */
  currentVersion: number;
  /** Version number of `previous` (or `null` when no predecessor exists). */
  previousVersion: number | null;
  mode: DiffMode;
}

/**
 * Read-only diff view rendered when the reviewer selects a non-current
 * version in the History tab. The `previous` markdown is the version
 * immediately preceding `current`; the `mode` toggle is owned by
 * `useVersionState` and surfaced through the sidebar.
 *
 * The Plate editor is built once per `(currentVersion, previousVersion, mode)`
 * tuple via React's `key`. Without all three components, switching between
 * historical versions in the same mode would reuse a stale Plate instance.
 */
export const DiffMount = ({
  current,
  previous,
  currentVersion,
  previousVersion,
  mode,
}: DiffMountProps): React.ReactElement => (
  <DiffEditor
    key={`${mode}|${previousVersion ?? "none"}|${currentVersion}`}
    current={current}
    previous={previous}
    mode={mode}
  />
);
