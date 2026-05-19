import { Button } from "./components/Button.tsx";

interface TopBarProps {
  onApprove: () => void;
  onDeny: () => void;
  busy?: boolean;
}

export const TopBar = ({ onApprove, onDeny, busy = false }: TopBarProps): React.ReactElement => (
  <header className="border-border bg-background flex items-center justify-between border-b px-6 py-3">
    <h1 className="text-muted-foreground text-sm font-medium">symbiot — review plan</h1>
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={onDeny} disabled={busy}>
        Request changes
      </Button>
      <Button onClick={onApprove} disabled={busy}>
        Approve
      </Button>
    </div>
  </header>
);
