import { Check, PanelRight, Send } from "lucide-react";

import { Button } from "./Button.tsx";
import { Separator } from "./Separator.tsx";
import { SidebarTrigger } from "./Sidebar.tsx";

export type TopBarMode = "plan" | "annotate";

interface TopBarProps {
  onApprove: () => void;
  onDeny: () => void;
  busy?: boolean;
  mode?: TopBarMode;
  /** When true, renders the annotation-sidebar toggle trigger on the right side. */
  showSidebarTrigger?: boolean;
}

const denyLabel = (mode: TopBarMode): string =>
  mode === "annotate" ? "Submit feedback" : "Request changes";

const headingFor = (mode: TopBarMode): string =>
  mode === "annotate" ? "symbiot — annotate markdown" : "symbiot — review plan";

interface ActionsProps {
  onApprove: () => void;
  onDeny: () => void;
  busy: boolean;
  mode: TopBarMode;
}

const Actions = ({ onApprove, onDeny, busy, mode }: ActionsProps): React.ReactElement => (
  <div className="flex items-center gap-2">
    <Button data-testid="top-bar-deny" variant="outline" size="sm" onClick={onDeny} disabled={busy}>
      <Send />
      {denyLabel(mode)}
    </Button>
    {mode === "plan" && (
      <Button data-testid="top-bar-approve" size="sm" onClick={onApprove} disabled={busy}>
        <Check />
        Approve
      </Button>
    )}
  </div>
);

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

export const TopBar = ({
  onApprove,
  onDeny,
  busy = false,
  mode = "plan",
  showSidebarTrigger = false,
}: TopBarProps): React.ReactElement => (
  <header
    data-testid="top-bar"
    data-mode={mode}
    className="border-border bg-background flex h-14 items-center gap-2 border-b px-4"
  >
    <h1 className="text-muted-foreground text-sm font-medium">{headingFor(mode)}</h1>
    <div className="ml-auto flex items-center gap-3">
      <Actions onApprove={onApprove} onDeny={onDeny} busy={busy} mode={mode} />
      <SidebarTriggerSlot show={showSidebarTrigger} />
    </div>
  </header>
);
