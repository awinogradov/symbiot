import { DraftEditor, type DraftEditorHandle } from "@symbiot/editor/components/DraftEditor";

/** Props for the editable draft-authoring surface. */
interface DraftMountProps {
  /** Markdown the editor boots from — autosaved body when one applies, else the boot plan. */
  markdown: string;
  /** Boot version — folded into the editor key so a new session forces a fresh Plate instance. */
  version: number;
  /** Receives the imperative handle (serialize-back) once Plate is constructed. */
  onReady: (handle: DraftEditorHandle) => void;
  /** Fires on every editor change; the host debounces autosave off it. */
  onChange: () => void;
}

/**
 * Editable draft-mode counterpart of `EditorMount`: mounts the free-text
 * `DraftEditor` keyed by boot version so Plate's initial value is baked in on
 * mount (per-render-mode editors are re-keyed, never value-swapped).
 */
export const DraftMount = ({
  markdown,
  version,
  onReady,
  onChange,
}: DraftMountProps): React.ReactElement => (
  <DraftEditor key={`draft-${version}`} markdown={markdown} onReady={onReady} onChange={onChange} />
);
