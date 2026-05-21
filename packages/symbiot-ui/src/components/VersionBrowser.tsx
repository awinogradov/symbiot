import { memo, useCallback } from "react";

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "./Sidebar.tsx";

const pad = (n: number): string => String(n).padStart(3, "0");

interface VersionBrowserProps {
  versions: number[];
  active: number;
  onSelect: (version: number) => void;
}

interface VersionRowProps {
  version: number;
  active: boolean;
  onSelect: (version: number) => void;
}

const VersionRowInner = ({ version, active, onSelect }: VersionRowProps): React.ReactElement => {
  const handleClick = useCallback((): void => onSelect(version), [version, onSelect]);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        data-testid={`version-row-${version}`}
        isActive={active}
        onClick={handleClick}
        size="lg"
        className="flex h-auto flex-col items-start gap-0.5 py-2"
      >
        <span className="text-sm font-medium">Version {pad(version)}</span>
        {active && <span className="text-muted-foreground text-xs">current</span>}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const VersionRow = memo(VersionRowInner);
VersionRow.displayName = "VersionRow";

/**
 * Sidebar list of plan versions persisted under
 * `~/.symbiot/history/{project}/{slug}/`. Renders newest first, highlights the
 * `active` version, and emits `onSelect(version)` when a row is clicked.
 */
export const VersionBrowser = ({
  versions,
  active,
  onSelect,
}: VersionBrowserProps): React.ReactElement => {
  if (versions.length === 0) {
    return (
      <p data-testid="version-browser-empty" className="text-muted-foreground px-2 text-xs">
        No history yet.
      </p>
    );
  }
  const ordered = [...versions].sort((a, b) => b - a);
  return (
    <SidebarMenu data-testid="version-browser">
      {ordered.map((version) => (
        <VersionRow
          key={version}
          version={version}
          active={version === active}
          onSelect={onSelect}
        />
      ))}
    </SidebarMenu>
  );
};
