import { useCallback, useState } from "react";

import { Button } from "./components/Button.tsx";
import { GlobalCommentComposer } from "./GlobalCommentComposer.tsx";

export type TopBarMode = "plan" | "annotate";

interface TopBarProps {
  onApprove: () => void;
  onDeny: () => void;
  onAddGlobalComment?: (body: string) => void;
  busy?: boolean;
  mode?: TopBarMode;
}

const denyLabel = (mode: TopBarMode): string =>
  mode === "annotate" ? "Submit feedback" : "Request changes";

const headingFor = (mode: TopBarMode): string =>
  mode === "annotate" ? "symbiot — annotate markdown" : "symbiot — review plan";

interface ActionsProps {
  onApprove: () => void;
  onDeny: () => void;
  onOpenGlobal?: () => void;
  busy: boolean;
  mode: TopBarMode;
}

const Actions = ({
  onApprove,
  onDeny,
  onOpenGlobal,
  busy,
  mode,
}: ActionsProps): React.ReactElement => (
  <div className="flex items-center gap-2">
    {onOpenGlobal !== undefined && (
      <Button
        data-testid="top-bar-global-comment"
        variant="ghost"
        onClick={onOpenGlobal}
        disabled={busy}
      >
        Global comment
      </Button>
    )}
    <Button data-testid="top-bar-deny" variant="outline" onClick={onDeny} disabled={busy}>
      {denyLabel(mode)}
    </Button>
    {mode === "plan" && (
      <Button data-testid="top-bar-approve" onClick={onApprove} disabled={busy}>
        Approve
      </Button>
    )}
  </div>
);

export const TopBar = ({
  onApprove,
  onDeny,
  onAddGlobalComment,
  busy = false,
  mode = "plan",
}: TopBarProps): React.ReactElement => {
  const [composerOpen, setComposerOpen] = useState(false);

  const onSave = useCallback(
    (body: string): void => {
      onAddGlobalComment?.(body);
      setComposerOpen(false);
    },
    [onAddGlobalComment]
  );

  return (
    <header
      data-testid="top-bar"
      data-mode={mode}
      className="border-border bg-background flex items-center justify-between border-b px-6 py-3"
    >
      <h1 className="text-muted-foreground text-sm font-medium">{headingFor(mode)}</h1>
      <Actions
        onApprove={onApprove}
        onDeny={onDeny}
        onOpenGlobal={
          onAddGlobalComment === undefined ? undefined : (): void => setComposerOpen(true)
        }
        busy={busy}
        mode={mode}
      />
      {onAddGlobalComment !== undefined && (
        <GlobalCommentComposer
          open={composerOpen}
          anchor={
            <span
              data-testid="global-composer-anchor"
              style={{ position: "absolute", top: 60, right: 24 }}
            />
          }
          onSave={onSave}
          onCancel={() => setComposerOpen(false)}
        />
      )}
    </header>
  );
};
