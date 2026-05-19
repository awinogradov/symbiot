import { useCallback, useState } from "react";

import { Button } from "./components/Button.tsx";
import { GlobalCommentComposer } from "./GlobalCommentComposer.tsx";

interface TopBarProps {
  onApprove: () => void;
  onDeny: () => void;
  onAddGlobalComment?: (body: string) => void;
  busy?: boolean;
}

export const TopBar = ({
  onApprove,
  onDeny,
  onAddGlobalComment,
  busy = false,
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
      className="border-border bg-background flex items-center justify-between border-b px-6 py-3"
    >
      <h1 className="text-muted-foreground text-sm font-medium">symbiot — review plan</h1>
      <div className="flex items-center gap-2">
        {onAddGlobalComment !== undefined && (
          <Button
            data-testid="top-bar-global-comment"
            variant="ghost"
            onClick={() => setComposerOpen(true)}
            disabled={busy}
          >
            Global comment
          </Button>
        )}
        <Button data-testid="top-bar-deny" variant="outline" onClick={onDeny} disabled={busy}>
          Request changes
        </Button>
        <Button data-testid="top-bar-approve" onClick={onApprove} disabled={busy}>
          Approve
        </Button>
      </div>
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
