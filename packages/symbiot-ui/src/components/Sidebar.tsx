import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type CSSProperties,
  type HTMLAttributes,
  type Ref,
} from "react";

import { cn } from "../utils/cn.ts";

import { Button } from "./Button.tsx";
import { Separator } from "./Separator.tsx";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./Sheet.tsx";
import { Skeleton } from "./Skeleton.tsx";

const sidebarWidth = "16rem";
const sidebarWidthMobile = "18rem";
const sidebarWidthIcon = "3rem";

interface SidebarContextValue {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

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

interface SidebarProviderProps extends HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  ref?: Ref<HTMLDivElement>;
}

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

interface SidebarProps extends HTMLAttributes<HTMLDivElement> {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
  ref?: Ref<HTMLDivElement>;
}

const NoCollapseSidebar = ({
  className,
  children,
  ref,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }): React.ReactElement => (
  <div
    ref={ref}
    data-slot="sidebar"
    className={cn(
      "bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col",
      className
    )}
    {...rest}
  >
    {children}
  </div>
);

interface MobileSidebarProps {
  side: "left" | "right";
  children: React.ReactNode;
}

const MobileSidebar = ({ side, children }: MobileSidebarProps): React.ReactElement => {
  const { openMobile, setOpenMobile } = useSidebar();
  return (
    <Sheet open={openMobile} onOpenChange={setOpenMobile}>
      <SheetContent
        data-slot="sidebar"
        data-sidebar="sidebar"
        data-mobile="true"
        side={side}
        style={{ "--sidebar-width": sidebarWidthMobile } as CSSProperties}
        className="bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden"
      >
        <SheetTitle className="sr-only">Sidebar</SheetTitle>
        <SheetDescription className="sr-only">Displays the mobile sidebar.</SheetDescription>
        <div className="flex h-full w-full flex-col">{children}</div>
      </SheetContent>
    </Sheet>
  );
};

const gapClasses = (variant: SidebarProps["variant"]): string =>
  variant === "floating" || variant === "inset"
    ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+1rem)]"
    : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)";

const containerSideClasses = (side: "left" | "right"): string =>
  side === "left"
    ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
    : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]";

const containerVariantClasses = (variant: SidebarProps["variant"]): string =>
  variant === "floating" || variant === "inset"
    ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+1rem+2px)]"
    : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l border-sidebar-border";

interface DesktopSidebarProps {
  side: "left" | "right";
  variant: NonNullable<SidebarProps["variant"]>;
  collapsible: NonNullable<SidebarProps["collapsible"]>;
  state: "expanded" | "collapsed";
  className?: string;
  children: React.ReactNode;
  ref?: Ref<HTMLDivElement>;
  rest: Omit<HTMLAttributes<HTMLDivElement>, "className" | "children">;
}

const DesktopSidebar = ({
  side,
  variant,
  collapsible,
  state,
  className,
  children,
  ref,
  rest,
}: DesktopSidebarProps): React.ReactElement => (
  <div
    ref={ref}
    className="group peer text-sidebar-foreground hidden md:block"
    data-state={state}
    data-collapsible={state === "collapsed" ? collapsible : ""}
    data-variant={variant}
    data-side={side}
    data-slot="sidebar"
  >
    <div
      data-slot="sidebar-gap"
      className={cn(
        "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
        "group-data-[collapsible=offcanvas]:w-0",
        "group-data-[side=right]:rotate-180",
        gapClasses(variant)
      )}
    />
    <div
      data-slot="sidebar-container"
      className={cn(
        "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
        containerSideClasses(side),
        containerVariantClasses(variant),
        className
      )}
      {...rest}
    >
      <div
        data-sidebar="sidebar"
        data-slot="sidebar-inner"
        className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
      >
        {children}
      </div>
    </div>
  </div>
);

const renderSidebar = (
  props: Required<Pick<SidebarProps, "side" | "variant" | "collapsible">> &
    SidebarProps & { state: "expanded" | "collapsed"; isMobile: boolean }
): React.ReactElement => {
  const { side, variant, collapsible, isMobile, state, className, children, ref, ...rest } = props;
  if (collapsible === "none") {
    return (
      <NoCollapseSidebar ref={ref} className={className} {...rest}>
        {children}
      </NoCollapseSidebar>
    );
  }
  if (isMobile) {
    return <MobileSidebar side={side}>{children}</MobileSidebar>;
  }
  return (
    <DesktopSidebar
      side={side}
      variant={variant}
      collapsible={collapsible}
      state={state}
      className={className}
      ref={ref}
      rest={rest}
    >
      {children}
    </DesktopSidebar>
  );
};

export const Sidebar = (props: SidebarProps): React.ReactElement => {
  const { isMobile, state } = useSidebar();
  return renderSidebar({
    side: "left",
    variant: "sidebar",
    collapsible: "offcanvas",
    ...props,
    isMobile,
    state,
  });
};

type SidebarTriggerProps = ComponentProps<typeof Button>;

export const SidebarTrigger = ({
  className,
  onClick,
  ...rest
}: SidebarTriggerProps): React.ReactElement => {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("size-7", className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...rest}
    >
      <span aria-hidden className="text-base leading-none">
        ☰
      </span>
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
};

export const SidebarRail = ({
  className,
  ...rest
}: HTMLAttributes<HTMLButtonElement>): React.ReactElement => {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      type="button"
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        "hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-px sm:flex",
        className
      )}
      {...rest}
    />
  );
};

interface InsetProps extends HTMLAttributes<HTMLElement> {
  ref?: Ref<HTMLElement>;
}

export const SidebarInset = ({ className, ref, ...rest }: InsetProps): React.ReactElement => (
  <main
    ref={ref}
    data-slot="sidebar-inset"
    className={cn(
      "bg-background relative flex w-full flex-1 flex-col",
      "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2",
      className
    )}
    {...rest}
  />
);

type SectionProps = HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> };

export const SidebarHeader = ({ className, ref, ...rest }: SectionProps): React.ReactElement => (
  <div
    ref={ref}
    data-sidebar="header"
    data-slot="sidebar-header"
    className={cn("flex flex-col gap-2 p-2", className)}
    {...rest}
  />
);

export const SidebarFooter = ({ className, ref, ...rest }: SectionProps): React.ReactElement => (
  <div
    ref={ref}
    data-sidebar="footer"
    data-slot="sidebar-footer"
    className={cn("flex flex-col gap-2 p-2", className)}
    {...rest}
  />
);

export const SidebarSeparator = ({
  className,
  ...rest
}: ComponentProps<typeof Separator>): React.ReactElement => (
  <Separator
    data-sidebar="separator"
    data-slot="sidebar-separator"
    className={cn("bg-sidebar-border mx-2 w-auto", className)}
    {...rest}
  />
);

export const SidebarContent = ({ className, ref, ...rest }: SectionProps): React.ReactElement => (
  <div
    ref={ref}
    data-sidebar="content"
    data-slot="sidebar-content"
    className={cn(
      "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
      className
    )}
    {...rest}
  />
);

export const SidebarGroup = ({ className, ref, ...rest }: SectionProps): React.ReactElement => (
  <div
    ref={ref}
    data-sidebar="group"
    data-slot="sidebar-group"
    className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
    {...rest}
  />
);

interface SidebarGroupLabelProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

export const SidebarGroupLabel = ({
  className,
  ref,
  ...rest
}: SidebarGroupLabelProps): React.ReactElement => (
  <div
    ref={ref}
    data-sidebar="group-label"
    data-slot="sidebar-group-label"
    className={cn(
      "text-sidebar-foreground/70 focus-visible:ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium transition-[margin,opacity] duration-200 ease-linear outline-none group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 focus-visible:ring-2",
      className
    )}
    {...rest}
  />
);

export const SidebarGroupContent = ({
  className,
  ref,
  ...rest
}: SectionProps): React.ReactElement => (
  <div
    ref={ref}
    data-sidebar="group-content"
    data-slot="sidebar-group-content"
    className={cn("w-full text-sm", className)}
    {...rest}
  />
);

interface SidebarMenuProps extends HTMLAttributes<HTMLUListElement> {
  ref?: Ref<HTMLUListElement>;
}

export const SidebarMenu = ({ className, ref, ...rest }: SidebarMenuProps): React.ReactElement => (
  <ul
    ref={ref}
    data-sidebar="menu"
    data-slot="sidebar-menu"
    className={cn("flex w-full min-w-0 flex-col gap-1", className)}
    {...rest}
  />
);

interface SidebarMenuItemProps extends HTMLAttributes<HTMLLIElement> {
  ref?: Ref<HTMLLIElement>;
}

export const SidebarMenuItem = ({
  className,
  ref,
  ...rest
}: SidebarMenuItemProps): React.ReactElement => (
  <li
    ref={ref}
    data-sidebar="menu-item"
    data-slot="sidebar-menu-item"
    className={cn("group/menu-item relative", className)}
    {...rest}
  />
);

export const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

interface SidebarMenuButtonProps
  extends HTMLAttributes<HTMLButtonElement>, VariantProps<typeof sidebarMenuButtonVariants> {
  asChild?: boolean;
  isActive?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export const SidebarMenuButton = ({
  asChild = false,
  isActive = false,
  variant,
  size,
  className,
  ref,
  ...rest
}: SidebarMenuButtonProps): React.ReactElement => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : "button"}
      data-sidebar="menu-button"
      data-slot="sidebar-menu-button"
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...rest}
    />
  );
};

export const SidebarMenuSkeleton = ({
  className,
  showIcon = false,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { showIcon?: boolean }): React.ReactElement => (
  <div
    data-sidebar="menu-skeleton"
    data-slot="sidebar-menu-skeleton"
    className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
    {...rest}
  >
    {showIcon && <Skeleton className="size-4 rounded-md" />}
    <Skeleton
      className="h-4 max-w-(--skeleton-width) flex-1"
      style={{ "--skeleton-width": "70%" } as CSSProperties}
    />
  </div>
);
