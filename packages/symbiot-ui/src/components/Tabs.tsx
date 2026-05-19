import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentPropsWithoutRef, Ref } from "react";

import { cn } from "../utils/cn.ts";

export const Tabs = TabsPrimitive.Root;

type TabsListProps = ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
  ref?: Ref<HTMLDivElement>;
};

export const TabsList = ({ className, ref, ...rest }: TabsListProps): React.ReactElement => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "bg-muted text-muted-foreground inline-flex h-9 items-center justify-center rounded-md p-1",
      className
    )}
    {...rest}
  />
);

type TabsTriggerProps = ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
  ref?: Ref<HTMLButtonElement>;
};

export const TabsTrigger = ({ className, ref, ...rest }: TabsTriggerProps): React.ReactElement => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "ring-offset-background data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center gap-1 rounded-sm px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...rest}
  />
);

type TabsContentProps = ComponentPropsWithoutRef<typeof TabsPrimitive.Content> & {
  ref?: Ref<HTMLDivElement>;
};

export const TabsContent = ({ className, ref, ...rest }: TabsContentProps): React.ReactElement => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("focus-visible:outline-none", className)}
    {...rest}
  />
);
