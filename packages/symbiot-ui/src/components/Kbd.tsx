import type { HTMLAttributes } from "react";

import { cn } from "../utils/cn.ts";

/**
 * Small visual hint that renders a keyboard shortcut next to an action label.
 *
 * @example
 *   <Button>Approve <Kbd>{formatHotkey("mod+enter")}</Kbd></Button>
 */
export const Kbd = ({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLElement>): React.ReactElement => (
  <kbd
    data-slot="kbd"
    className={cn(
      "border-border bg-muted text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 font-mono text-[10px] leading-none uppercase",
      className
    )}
    {...rest}
  >
    {children}
  </kbd>
);

const isMac = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
};

const macKeys: Record<string, string> = {
  mod: "⌘",
  meta: "⌘",
  cmd: "⌘",
  ctrl: "Ctrl",
  alt: "⌥",
  option: "⌥",
  shift: "⇧",
};

const nonMacKeys: Record<string, string> = {
  mod: "Ctrl",
  meta: "⌘",
  cmd: "⌘",
  ctrl: "Ctrl",
  alt: "Alt",
  option: "Alt",
  shift: "Shift",
};

const namedKeys: Record<string, string> = {
  enter: "↵",
  return: "↵",
  escape: "Esc",
  esc: "Esc",
  space: "Space",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

const renderKey = (part: string, mac: boolean): string => {
  const key = part.trim().toLowerCase();
  const modifierTable = mac ? macKeys : nonMacKeys;
  return modifierTable[key] ?? namedKeys[key] ?? part.toUpperCase();
};

/**
 * Convert a `react-hotkeys-hook` key string (e.g. `mod+enter`, `c`) into a
 * human-readable label. `mod` resolves to ⌘ on Apple platforms and `Ctrl`
 * everywhere else; common navigation keys (`enter`, `escape`, arrows) get
 * their conventional symbols. Combinations are joined with a thin space.
 */
export const formatHotkey = (keys: string): string => {
  const mac = isMac();
  return keys
    .split("+")
    .map((part) => renderKey(part, mac))
    .join(" ");
};
