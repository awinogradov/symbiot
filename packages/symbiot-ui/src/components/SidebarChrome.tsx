import type { HTMLAttributes, Ref } from "react";

import { cn } from "../utils/cn.ts";

import { useSidebar } from "./SidebarProvider.tsx";

/** Hover-target rail that toggles the sidebar without a visible button. */
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

/** Main content well rendered alongside the sidebar; styled to dovetail with `variant="inset"`. */
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
