import { AppLogo } from "./AppLogo.tsx";
import { Button } from "./Button.tsx";
import { CheckIcon } from "./CheckIcon.tsx";
import { Kbd, formatHotkey } from "./Kbd.tsx";
import { SendIcon } from "./SendIcon.tsx";
import { SettingsMenu } from "./SettingsMenu.tsx";

export type TopBarMode = "plan" | "annotate";

interface TopBarProps {
  onApprove: () => void;
  onDeny: () => void;
  /** Name of the project being reviewed; rendered as muted subtitle next to the wordmark. */
  projectName: string;
  busy?: boolean;
  mode?: TopBarMode;
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
      <Button
        data-testid="top-bar-approve"
        variant="outline"
        size="sm"
        onClick={onApprove}
        disabled={busy}
      >
        <CheckIcon />
        Approve
        <Kbd>{formatHotkey("mod+enter")}</Kbd>
      </Button>
    );
  }
  return (
    <Button data-testid="top-bar-deny" variant="outline" size="sm" onClick={onDeny} disabled={busy}>
      <SendIcon />
      {denyLabel(mode)}
      <Kbd>{formatHotkey("mod+enter")}</Kbd>
    </Button>
  );
};

export const TopBar = ({
  onApprove,
  onDeny,
  projectName,
  busy = false,
  mode = "plan",
  hasAnnotations = false,
}: TopBarProps): React.ReactElement => (
  <header
    data-testid="top-bar"
    data-mode={mode}
    className="border-border bg-topbar flex h-14 items-center gap-2 border-b pr-6 pl-10"
  >
    <div data-testid="top-bar-brand" className="flex items-center gap-2">
      <AppLogo size={20} className="text-foreground" />
      <h1 className="text-sm font-medium">
        Symbiot
        <span className="text-muted-foreground">{` · ${projectName}`}</span>
      </h1>
    </div>
    <div className="ml-auto flex items-center gap-3">
      <SettingsMenu />
      <Actions
        onApprove={onApprove}
        onDeny={onDeny}
        busy={busy}
        mode={mode}
        hasAnnotations={hasAnnotations}
      />
    </div>
  </header>
);
