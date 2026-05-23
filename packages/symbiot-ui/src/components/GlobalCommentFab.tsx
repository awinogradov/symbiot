import { MessageSquarePlus } from "lucide-react";
import { useCallback, useState } from "react";

import { cn } from "../utils/cn.ts";

import { AnnotationComposer, type AnnotationComposerPayload } from "./AnnotationComposer.tsx";
import { Button } from "./Button.tsx";
import { Kbd } from "./Kbd.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip.tsx";

/** Props for the floating action button that opens the global-comment composer. */
interface GlobalCommentFabProps {
  /** Invoked once the composer Save is pressed with a non-empty body or images. */
  onAddGlobalComment: (body: string, images: string[]) => void;
  /** Disables the trigger while a submission is in flight. */
  disabled?: boolean;
  /** Extra Tailwind classes applied to the trigger button. */
  className?: string;
  /** Controlled composer-open state. When provided alongside {@link onOpenChange}, the host owns the lifecycle (e.g. for hotkey-driven opening). */
  open?: boolean;
  /** Setter paired with {@link open} for the controlled mode. */
  onOpenChange?: (next: boolean) => void;
}

/** Floating action button anchored bottom-right of the editor column that opens the global comment composer. */
export const GlobalCommentFab = ({
  onAddGlobalComment,
  disabled = false,
  className,
  open: openProp,
  onOpenChange,
}: GlobalCommentFabProps): React.ReactElement => {
  const [openState, setOpenState] = useState(false);
  const isControlled = openProp !== undefined && onOpenChange !== undefined;
  const open = isControlled ? openProp : openState;
  const setOpen = useCallback(
    (next: boolean): void => {
      if (isControlled) onOpenChange(next);
      else setOpenState(next);
    },
    [isControlled, onOpenChange]
  );

  const onSave = useCallback(
    (payload: AnnotationComposerPayload): void => {
      onAddGlobalComment(payload.body, payload.images);
      setOpen(false);
    },
    [onAddGlobalComment, setOpen]
  );

  const onCancel = useCallback((): void => setOpen(false), [setOpen]);
  const onOpen = useCallback((): void => setOpen(true), [setOpen]);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            data-testid="editor-global-comment"
            variant="outline"
            size="icon"
            onClick={onOpen}
            disabled={disabled}
            className={cn(
              "absolute right-24 bottom-6 z-10 size-12 rounded-full shadow-lg",
              className
            )}
            aria-label="Global comment"
          >
            <MessageSquarePlus className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="inline-flex items-center gap-1.5">
          Global comment
          <Kbd>C</Kbd>
        </TooltipContent>
      </Tooltip>
      <AnnotationComposer kind="global" open={open} onSave={onSave} onCancel={onCancel} />
    </>
  );
};
