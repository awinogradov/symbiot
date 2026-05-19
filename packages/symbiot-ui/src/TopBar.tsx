import { Button } from "./components/Button.tsx";

interface TopBarProps {
  onApprove: () => void;
  onDeny: () => void;
  busy?: boolean;
}

export const TopBar = ({ onApprove, onDeny, busy = false }: TopBarProps): React.ReactElement => (
  <header
    data-testid="top-bar"
    className="border-border bg-background flex items-center justify-between border-b px-6 py-3"
  >
    <h1 className="text-muted-foreground text-sm font-medium">symbiot — review plan</h1>
    <div className="flex items-center gap-2">
      <Button data-testid="top-bar-deny" variant="outline" onClick={onDeny} disabled={busy}>
        Request changes
      </Button>
      <Button data-testid="top-bar-approve" onClick={onApprove} disabled={busy}>
        Approve
      </Button>
    </div>
  </header>
);
