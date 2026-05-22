import { type SidebarDiffMode } from "./AnnotationSidebarTypes.tsx";
import { Button } from "./Button.tsx";
import { SidebarGroup } from "./SidebarSection.tsx";
import { ToggleGroup, ToggleGroupItem } from "./ToggleGroup.tsx";
import { VersionBrowser } from "./VersionBrowser.tsx";

/** Props for the Clean/Raw diff render toggle. */
interface DiffToggleProps {
  diffMode: SidebarDiffMode;
  onChange: (next: string) => void;
}

const DiffModeToggle = ({ diffMode, onChange }: DiffToggleProps): React.ReactElement => (
  <ToggleGroup
    type="single"
    value={diffMode}
    onValueChange={onChange}
    variant="outline"
    size="sm"
    data-testid="diff-mode-toggle"
    className="w-full"
  >
    <ToggleGroupItem
      value="clean"
      data-testid="diff-mode-clean"
      aria-label="Show only changed blocks"
      className="flex-1"
    >
      Clean
    </ToggleGroupItem>
    <ToggleGroupItem
      value="raw"
      data-testid="diff-mode-raw"
      aria-label="Show the full diff"
      className="flex-1"
    >
      Raw
    </ToggleGroupItem>
  </ToggleGroup>
);

/** Props for the predecessor-diff overlay toggle button. */
interface CompareButtonProps {
  active: boolean;
  onToggle: () => void;
}

const CompareButton = ({ active, onToggle }: CompareButtonProps): React.ReactElement => (
  <Button
    data-testid={active ? "compare-back-to-editing" : "compare-with-previous"}
    variant={active ? "secondary" : "outline"}
    size="sm"
    className="w-full"
    onClick={onToggle}
  >
    {active ? "Back to editing" : "Compare with previous"}
  </Button>
);

/** Props for the History tab body — version list + diff/compare controls. */
interface HistoryPanelProps {
  versions: number[];
  activeVersion: number;
  onSelectVersion: (version: number) => void;
  showDiffToggle: boolean;
  diffMode: SidebarDiffMode;
  onDiffModeChange: (next: string) => void;
  canCompareWithPredecessor: boolean;
  comparingWithPredecessor: boolean;
  onToggleCompare: () => void;
}

/** Compose the Compare button, Clean/Raw toggle, and version browser. */
export const HistoryPanel = ({
  versions,
  activeVersion,
  onSelectVersion,
  showDiffToggle,
  diffMode,
  onDiffModeChange,
  canCompareWithPredecessor,
  comparingWithPredecessor,
  onToggleCompare,
}: HistoryPanelProps): React.ReactElement => (
  <SidebarGroup className="flex flex-col gap-2 px-2">
    {canCompareWithPredecessor && (
      <CompareButton active={comparingWithPredecessor} onToggle={onToggleCompare} />
    )}
    {showDiffToggle && <DiffModeToggle diffMode={diffMode} onChange={onDiffModeChange} />}
    <VersionBrowser versions={versions} active={activeVersion} onSelect={onSelectVersion} />
  </SidebarGroup>
);
