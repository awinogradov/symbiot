import { createContext, use, useMemo, useState, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "../utils/cn.ts";

interface SidebarState {
  open: boolean;
  toggle: () => void;
  setOpen: (next: boolean) => void;
}

const SidebarContext = createContext<SidebarState | null>(null);

interface SidebarProviderProps {
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Wraps a viewer screen with a right-aligned sidebar drawer state. Consumers
 * read open/toggle via `useSidebar()` and render `<Sidebar>` to surface the
 * drawer. No layout assumptions — the parent decides flex / grid placement.
 */
export const SidebarProvider = ({
  defaultOpen = true,
  children,
}: SidebarProviderProps): React.ReactElement => {
  const [open, setOpen] = useState(defaultOpen);
  const value = useMemo<SidebarState>(
    () => ({
      open,
      setOpen,
      toggle: () => setOpen((prev) => !prev),
    }),
    [open]
  );
  return <SidebarContext value={value}>{children}</SidebarContext>;
};

export const useSidebar = (): SidebarState => {
  const ctx = use(SidebarContext);
  if (ctx === null) throw new Error("useSidebar must be used within <SidebarProvider>");
  return ctx;
};

interface SidebarProps extends HTMLAttributes<HTMLElement> {
  /** Default `right`; pass `left` to mirror. */
  side?: "left" | "right";
}

export const Sidebar = ({
  side = "right",
  className,
  children,
  ...rest
}: SidebarProps): React.ReactElement | null => {
  const { open } = useSidebar();
  if (!open) return null;
  const borderClass = side === "right" ? "border-l" : "border-r";
  return (
    <aside
      data-testid="annotation-sidebar"
      className={cn(
        "border-border bg-background flex w-80 flex-col overflow-y-auto",
        borderClass,
        className
      )}
      {...rest}
    >
      {children}
    </aside>
  );
};
