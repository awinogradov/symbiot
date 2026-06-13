import { createContext } from "react";

/**
 * Toggle handler for GFM task checkboxes, provided by the authoring
 * `ReviewEditor` and consumed by `ListElement`. `null` in read-only surfaces
 * (the historical `DiffEditor`), where checkboxes stay non-interactive. The
 * argument is the Plate list element the clicked checkbox belongs to.
 */
export const TaskToggleContext = createContext<((element: unknown) => void) | null>(null);
