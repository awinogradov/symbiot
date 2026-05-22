import type { CSSProperties, HTMLAttributes, Ref } from "react";

import { cn } from "../utils/cn.ts";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./Sheet.tsx";
import { sidebarWidthMobile, useSidebar } from "./SidebarProvider.tsx";

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

/** Composite sidebar root — picks the desktop / mobile / no-collapse layout based on viewport + props. */
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
