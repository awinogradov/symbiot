import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { CSSProperties, HTMLAttributes, Ref } from "react";

import { cn } from "../utils/cn.ts";

import { Skeleton } from "./Skeleton.tsx";

interface SidebarMenuProps extends HTMLAttributes<HTMLUListElement> {
  ref?: Ref<HTMLUListElement>;
}

/** Vertical list container for `SidebarMenuItem` rows. */
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

/** Row wrapper inside `SidebarMenu`. Provides the hover/focus group hook. */
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

/** Class-variance-authority variants for `SidebarMenuButton`. */
export const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding,transform] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:scale-[0.98] active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background ring-1 ring-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:ring-sidebar-accent",
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

/** Primary click target inside a `SidebarMenuItem` — supports `asChild` for Radix slots. */
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

interface SidebarMenuActionProps extends HTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  showOnHover?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

const sidebarMenuActionBaseClass =
  "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-2 right-2 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-none transition-opacity focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0";

const sidebarMenuActionHoverClass =
  "opacity-0 group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100";

const composeSidebarMenuActionClass = (showOnHover: boolean, className?: string): string =>
  cn(sidebarMenuActionBaseClass, showOnHover && sidebarMenuActionHoverClass, className);

/** Secondary action (e.g. remove ×) pinned to the right of a `SidebarMenuButton`. */
export const SidebarMenuAction = ({
  asChild = false,
  showOnHover = false,
  className,
  ref,
  ...rest
}: SidebarMenuActionProps): React.ReactElement => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : "button"}
      data-sidebar="menu-action"
      data-slot="sidebar-menu-action"
      className={composeSidebarMenuActionClass(showOnHover, className)}
      {...rest}
    />
  );
};

/** Loading-state placeholder for a sidebar menu row. */
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
