import { PanelRight, Settings } from "lucide-react";
import { useCallback, useState } from "react";

import { AppLogo } from "./AppLogo.tsx";
import { Button } from "./Button.tsx";
import { CheckIcon } from "./CheckIcon.tsx";
import { Kbd, formatHotkey } from "./Kbd.tsx";
import { SendIcon } from "./SendIcon.tsx";
import { Separator } from "./Separator.tsx";
import { SettingsDialog } from "./SettingsDialog.tsx";
import { SidebarTrigger } from "./SidebarChrome.tsx";

export type TopBarMode = "plan" | "annotate";

interface TopBarProps {
  onApprove: () => void;
  onDeny: () => void;
  /** Name of the project being reviewed; rendered as muted subtitle next to the wordmark. */
  projectName: string;
  busy?: boolean;
  mode?: TopBarMode;
  /** When true, renders the annotation-sidebar toggle trigger on the right side. */
  showSidebarTrigger?: boolean;
  /** In `plan` mode, swaps the action button: Approve when false, Request changes when true. */
  hasAnnotations?: boolean;
}

const denyLabel = (mode: TopBarMode): string =>
  mode === "annotate" ? "Submit feedback" : "Request changes";

interface ActionsProps {
  onApprove: () => void;
  onDeny: () => void;
  busy: boolean;
  mode: TopBarMode;
  hasAnnotations: boolean;
}

const Actions = ({
  onApprove,
  onDeny,
  busy,
  mode,
  hasAnnotations,
}: ActionsProps): React.ReactElement => {
  if (mode === "plan" && !hasAnnotations) {
    return (
      <Button data-testid="top-bar-approve" size="sm" onClick={onApprove} disabled={busy}>
        <CheckIcon />
        Approve
        <Kbd>{formatHotkey("mod+enter")}</Kbd>
      </Button>
    );
  }
  return (
    <Button data-testid="top-bar-deny" size="sm" onClick={onDeny} disabled={busy}>
      <SendIcon />
      {denyLabel(mode)}
      <Kbd>{formatHotkey("mod+enter")}</Kbd>
    </Button>
  );
};

const SidebarTriggerSlot = ({ show }: { show: boolean }): React.ReactElement | null => {
  if (!show) return null;
  return (
    <>
      <Separator orientation="vertical" className="h-6" />
      <SidebarTrigger data-testid="top-bar-sidebar-trigger" className="size-8">
        <PanelRight />
      </SidebarTrigger>
    </>
  );
};

interface SettingsTriggerSlotProps {
  onClick: () => void;
}

const SettingsTriggerSlot = ({ onClick }: SettingsTriggerSlotProps): React.ReactElement => (
  <Button
    data-testid="top-bar-settings"
    variant="ghost"
    size="icon"
    aria-label="Settings"
    onClick={onClick}
    className="size-8"
  >
    <Settings />
  </Button>
);

export const TopBar = ({
  onApprove,
  onDeny,
  projectName,
  busy = false,
  mode = "plan",
  showSidebarTrigger = false,
  hasAnnotations = false,
}: TopBarProps): React.ReactElement => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSettings = useCallback((): void => setSettingsOpen(true), []);

  return (
    <>
      <header
        data-testid="top-bar"
        data-mode={mode}
        className="border-border bg-background flex h-14 items-center gap-2 border-b px-8"
      >
        <div data-testid="top-bar-brand" className="flex items-center gap-2">
          <AppLogo size={20} className="text-foreground" />
          <h1 className="text-sm font-medium">
            Symbiot
            <span className="text-muted-foreground">{` · ${projectName}`}</span>
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <SettingsTriggerSlot onClick={openSettings} />
          <Actions
            onApprove={onApprove}
            onDeny={onDeny}
            busy={busy}
            mode={mode}
            hasAnnotations={hasAnnotations}
          />
          <SidebarTriggerSlot show={showSidebarTrigger} />
        </div>
      </header>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
};
