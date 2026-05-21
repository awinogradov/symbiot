import { Check, PanelRight, Send } from "lucide-react";

import { AppLogo } from "./AppLogo.tsx";
import { Button } from "./Button.tsx";
import { Separator } from "./Separator.tsx";
import { SidebarTrigger } from "./Sidebar.tsx";

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
        <Check />
        Approve
      </Button>
    );
  }
  return (
    <Button data-testid="top-bar-deny" size="sm" onClick={onDeny} disabled={busy}>
      <Send />
      {denyLabel(mode)}
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

export const TopBar = ({
  onApprove,
  onDeny,
  projectName,
  busy = false,
  mode = "plan",
  showSidebarTrigger = false,
  hasAnnotations = false,
}: TopBarProps): React.ReactElement => (
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
);
