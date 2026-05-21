import { DiffEditor, type DiffMode } from "@symbiot/editor/components/DiffEditor";

interface DiffMountProps {
  current: string;
  previous: string;
  mode: DiffMode;
}

/**
 * Read-only diff view rendered when the reviewer selects a non-current
 * version in the History tab. The `previous` markdown is the version
 * immediately preceding `current`; the `mode` toggle is owned by
 * `useVersionState` and surfaced through the sidebar.
 */
export const DiffMount = ({ current, previous, mode }: DiffMountProps): React.ReactElement => (
  // Re-key on mode so the underlying Plate editor re-creates with the new
  // diff value when the reviewer flips Clean ↔ Raw.
  <DiffEditor key={mode} current={current} previous={previous} mode={mode} />
);
