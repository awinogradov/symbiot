import { useCallback, useState } from "react";

import { Button } from "./Button.tsx";
import { GlobalCommentComposer } from "./GlobalCommentComposer.tsx";
import { ToggleGroup, ToggleGroupItem } from "./ToggleGroup.tsx";

export type TopBarMode = "plan" | "annotate";
export type EditorMode = "review" | "redline";

interface TopBarProps {
  onApprove: () => void;
  onDeny: () => void;
  onAddGlobalComment?: (body: string, images: string[]) => void;
  busy?: boolean;
  mode?: TopBarMode;
  editorMode?: EditorMode;
  onEditorModeChange?: (next: EditorMode) => void;
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

interface ModeToggleProps {
  value: EditorMode;
  onChange: (next: EditorMode) => void;
  busy: boolean;
}

const ModeToggle = ({ value, onChange, busy }: ModeToggleProps): React.ReactElement => (
  <ToggleGroup
    type="single"
    value={value}
    onValueChange={(next): void => {
      if (next === "review" || next === "redline") onChange(next);
    }}
    disabled={busy}
    data-testid="top-bar-mode-toggle"
  >
    <ToggleGroupItem value="review" data-testid="mode-review">
      Review
    </ToggleGroupItem>
    <ToggleGroupItem value="redline" data-testid="mode-redline">
      Redline
    </ToggleGroupItem>
  </ToggleGroup>
);

interface ModeToggleSlotProps {
  editorMode: EditorMode | undefined;
  onEditorModeChange: ((next: EditorMode) => void) | undefined;
  busy: boolean;
}

const ModeToggleSlot = ({
  editorMode,
  onEditorModeChange,
  busy,
}: ModeToggleSlotProps): React.ReactElement | null => {
  if (editorMode === undefined || onEditorModeChange === undefined) return null;
  return <ModeToggle value={editorMode} onChange={onEditorModeChange} busy={busy} />;
};

export const TopBar = ({
  onApprove,
  onDeny,
  onAddGlobalComment,
  busy = false,
  mode = "plan",
  editorMode,
  onEditorModeChange,
}: TopBarProps): React.ReactElement => {
  const [composerOpen, setComposerOpen] = useState(false);

  const onSave = useCallback(
    (payload: { body: string; images: string[] }): void => {
      onAddGlobalComment?.(payload.body, payload.images);
      setComposerOpen(false);
    },
    [onAddGlobalComment]
  );

  const onOpenGlobal =
    onAddGlobalComment === undefined ? undefined : (): void => setComposerOpen(true);

  return (
    <header
      data-testid="top-bar"
      data-mode={mode}
      className="border-border bg-background flex items-center justify-between border-b px-6 py-3"
    >
      <h1 className="text-muted-foreground text-sm font-medium">{headingFor(mode)}</h1>
      <div className="flex items-center gap-3">
        <ModeToggleSlot
          editorMode={editorMode}
          onEditorModeChange={onEditorModeChange}
          busy={busy}
        />
        <Actions
          onApprove={onApprove}
          onDeny={onDeny}
          onOpenGlobal={onOpenGlobal}
          busy={busy}
          mode={mode}
        />
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
