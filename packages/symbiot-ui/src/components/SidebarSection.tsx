import type { ComponentProps, HTMLAttributes, Ref } from "react";

import { cn } from "../utils/cn.ts";

import { Separator } from "./Separator.tsx";

type SectionProps = HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> };

/** Top-of-sidebar slot — typically holds a title + total badge. */
export const SidebarHeader = ({ className, ref, ...rest }: SectionProps): React.ReactElement => (
  <div
    ref={ref}
    data-sidebar="header"
    data-slot="sidebar-header"
    className={cn("flex flex-col gap-2 p-2", className)}
    {...rest}
  />
);

/** Bottom-of-sidebar slot — typically holds "Clear all" or similar destructive actions. */
export const SidebarFooter = ({ className, ref, ...rest }: SectionProps): React.ReactElement => (
  <div
    ref={ref}
    data-sidebar="footer"
    data-slot="sidebar-footer"
    className={cn("flex flex-col gap-2 p-2", className)}
    {...rest}
  />
);

/** Thin separator between sidebar regions. */
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

/** Scrolling middle region that holds menus and groups. */
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

/** Group container that wraps a labelled section inside `SidebarContent`. */
export const SidebarGroup = ({ className, ref, ...rest }: SectionProps): React.ReactElement => (
  <div
    ref={ref}
    data-sidebar="group"
    data-slot="sidebar-group"
    className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
    {...rest}
  />
);

/** Props for {@link SidebarGroupLabel}. */
interface SidebarGroupLabelProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/** Inline label rendered above a `SidebarGroup` body. */
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

/** Body slot of a `SidebarGroup`; holds the actual menu / list. */
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
