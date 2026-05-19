import { Check, MessageSquarePlus, PanelRight, Send } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "./Button.tsx";
import { GlobalCommentComposer } from "./GlobalCommentComposer.tsx";
import { Separator } from "./Separator.tsx";
import { SidebarTrigger } from "./Sidebar.tsx";

export type TopBarMode = "plan" | "annotate";

interface TopBarProps {
  onApprove: () => void;
  onDeny: () => void;
  onAddGlobalComment?: (body: string, images: string[]) => void;
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
        size="sm"
        onClick={onOpenGlobal}
        disabled={busy}
      >
        <MessageSquarePlus />
        Global comment
      </Button>
    )}
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

interface GlobalComposerSlotProps {
  onAddGlobalComment: TopBarProps["onAddGlobalComment"];
  open: boolean;
  onSave: (payload: { body: string; images: string[] }) => void;
  onCancel: () => void;
}

const GlobalComposerSlot = ({
  onAddGlobalComment,
  open,
  onSave,
  onCancel,
}: GlobalComposerSlotProps): React.ReactElement | null => {
  if (onAddGlobalComment === undefined) return null;
  return <GlobalCommentComposer open={open} onSave={onSave} onCancel={onCancel} />;
};

const useGlobalComposer = (
  onAddGlobalComment: TopBarProps["onAddGlobalComment"]
): {
  open: boolean;
  onSave: (payload: { body: string; images: string[] }) => void;
  onCancel: () => void;
  onOpenGlobal: (() => void) | undefined;
} => {
  const [open, setOpen] = useState(false);
  const onSave = useCallback(
    (payload: { body: string; images: string[] }): void => {
      onAddGlobalComment?.(payload.body, payload.images);
      setOpen(false);
    },
    [onAddGlobalComment]
  );
  const onCancel = useCallback((): void => setOpen(false), []);
  const openComposer = useCallback((): void => setOpen(true), []);
  const onOpenGlobal = onAddGlobalComment === undefined ? undefined : openComposer;
  return { open, onSave, onCancel, onOpenGlobal };
};

export const TopBar = ({
  onApprove,
  onDeny,
  onAddGlobalComment,
  busy = false,
  mode = "plan",
  showSidebarTrigger = false,
}: TopBarProps): React.ReactElement => {
  const composer = useGlobalComposer(onAddGlobalComment);

  return (
    <header
      data-testid="top-bar"
      data-mode={mode}
      className="border-border bg-background flex h-14 items-center gap-2 border-b px-4"
    >
      <h1 className="text-muted-foreground text-sm font-medium">{headingFor(mode)}</h1>
      <div className="ml-auto flex items-center gap-3">
        <Actions
          onApprove={onApprove}
          onDeny={onDeny}
          onOpenGlobal={composer.onOpenGlobal}
          busy={busy}
          mode={mode}
        />
        <SidebarTriggerSlot show={showSidebarTrigger} />
      </div>
      <GlobalComposerSlot
        onAddGlobalComment={onAddGlobalComment}
        open={composer.open}
        onSave={composer.onSave}
        onCancel={composer.onCancel}
      />
    </header>
  );
};
