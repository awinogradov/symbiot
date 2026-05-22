import { MessageSquare, Plus, Replace, Strikethrough } from "lucide-react";
import { Button } from "@symbiot/ui/components/Button";

import { FloatingToolbar } from "./FloatingToolbar.tsx";

/** Click handlers for each toolbar button. Wired by {@link useToolbarHandlers}. */
interface ToolbarButtonsProps {
  onComment: () => void;
  onInsert: () => void;
  onReplace: () => void;
  onDelete: () => void;
}

/** Selection-anchored floating toolbar with Comment / Insert / Replace / Delete buttons. */
export const ToolbarButtons = ({
  onComment,
  onInsert,
  onReplace,
  onDelete,
}: ToolbarButtonsProps): React.ReactElement => (
  <FloatingToolbar>
    <Button data-testid="toolbar-comment" variant="ghost" size="sm" onClick={onComment}>
      <MessageSquare />
      Comment
    </Button>
    <Button data-testid="toolbar-insert" variant="ghost" size="sm" onClick={onInsert}>
      <Plus />
      Insert
    </Button>
    <Button data-testid="toolbar-replace" variant="ghost" size="sm" onClick={onReplace}>
      <Replace />
      Replace
    </Button>
    <Button data-testid="toolbar-delete" variant="ghost" size="sm" onClick={onDelete}>
      <Strikethrough />
      Delete
    </Button>
  </FloatingToolbar>
);
