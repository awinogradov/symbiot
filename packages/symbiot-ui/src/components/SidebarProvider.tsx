import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type HTMLAttributes,
  type Ref,
} from "react";

import { cn } from "../utils/cn.ts";

/** Shape of the sidebar context exposed via {@link useSidebar}. */
export interface SidebarContextValue {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

/** Read sidebar state + actions from the nearest {@link SidebarProvider}. */
export const useSidebar = (): SidebarContextValue => {
  const ctx = use(SidebarContext);
  if (ctx === null) throw new Error("useSidebar must be used within <SidebarProvider>");
  return ctx;
};

const useIsMobile = (breakpoint = 768): boolean => {
  const query = `(max-width: ${breakpoint - 1}px)`;
  const subscribe = useCallback(
    (notify: () => void): (() => void) => {
      const mql = globalThis.matchMedia(query);
      mql.addEventListener("change", notify);
      return () => mql.removeEventListener("change", notify);
    },
    [query]
  );
  const getSnapshot = useCallback((): boolean => globalThis.matchMedia(query).matches, [query]);
  const getServerSnapshot = useCallback((): boolean => false, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};

/** Tailwind custom-property width for the desktop sidebar. */
export const sidebarWidth = "16rem";
/** Tailwind custom-property width for the mobile sidebar (Sheet). */
export const sidebarWidthMobile = "18rem";
/** Tailwind custom-property width for the collapsed icon-only sidebar. */
export const sidebarWidthIcon = "3rem";

/** Props for the sidebar root provider. */
interface SidebarProviderProps extends HTMLAttributes<HTMLDivElement> {
  /** Uncontrolled initial open state. Ignored when `open` is passed. */
  defaultOpen?: boolean;
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean;
  /** Notify host when the open state changes. */
  onOpenChange?: (open: boolean) => void;
  ref?: Ref<HTMLDivElement>;
}

/** Context provider that owns the open / mobile-open / toggle state for the sidebar primitives. */
export const SidebarProvider = ({
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  className,
  style,
  children,
  ref,
  ...rest
}: SidebarProviderProps): React.ReactElement => {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = useState(false);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = openProp ?? internalOpen;

  const setOpen = useCallback(
    (next: boolean): void => {
      if (onOpenChange !== undefined) onOpenChange(next);
      else setInternalOpen(next);
    },
    [onOpenChange]
  );

  const toggleSidebar = useCallback((): void => {
    if (isMobile) setOpenMobile((prev) => !prev);
    else setOpen(!open);
  }, [isMobile, open, setOpen]);

  const value = useMemo<SidebarContextValue>(
    () => ({
      state: open ? "expanded" : "collapsed",
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [open, setOpen, isMobile, openMobile, toggleSidebar]
  );

  return (
    <SidebarContext value={value}>
      <div
        ref={ref}
        data-slot="sidebar-wrapper"
        style={
          {
            "--sidebar-width": sidebarWidth,
            "--sidebar-width-icon": sidebarWidthIcon,
            ...style,
          } as CSSProperties
        }
        className={cn(
          "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
          className
        )}
        {...rest}
      >
        {children}
      </div>
    </SidebarContext>
  );
};
