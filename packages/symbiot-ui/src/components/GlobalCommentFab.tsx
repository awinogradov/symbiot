import { MessageSquarePlus } from "lucide-react";
import { useCallback, useState } from "react";

import { cn } from "../utils/cn.ts";

import { AnnotationComposer, type AnnotationComposerPayload } from "./AnnotationComposer.tsx";
import { Button } from "./Button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip.tsx";

interface GlobalCommentFabProps {
  onAddGlobalComment: (body: string, images: string[]) => void;
  disabled?: boolean;
  className?: string;
}

/** Floating action button anchored bottom-right of the editor column that opens the global comment composer. */
export const GlobalCommentFab = ({
  onAddGlobalComment,
  disabled = false,
  className,
}: GlobalCommentFabProps): React.ReactElement => {
  const [open, setOpen] = useState(false);

  const onSave = useCallback(
    (payload: AnnotationComposerPayload): void => {
      onAddGlobalComment(payload.body, payload.images);
      setOpen(false);
    },
    [onAddGlobalComment]
  );

  const onCancel = useCallback((): void => setOpen(false), []);
  const onOpen = useCallback((): void => setOpen(true), []);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            data-testid="editor-global-comment"
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
        <TooltipContent side="left">Global comment</TooltipContent>
      </Tooltip>
      <AnnotationComposer kind="global" open={open} onSave={onSave} onCancel={onCancel} />
    </>
  );
};
