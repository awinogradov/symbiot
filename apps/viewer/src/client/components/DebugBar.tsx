/**
 * @module DebugBar
 * Fixed-position bar pinned to the bottom-right of the viewport that surfaces
 * the running build's version + git SHA on every viewer screen, so a user
 * reporting a bug can paste the SHA from a single screenshot. Hover/focus
 * reveals a Tooltip with the full SHA, ISO build timestamp, and viewer mode;
 * activating the badge copies the full SHA to the clipboard.
 *
 * Reads the Vite-injected global `symbiotBuildInfo` (declared in
 * `apps/viewer/src/client/buildInfo.d.ts`, resolved at build time by
 * `apps/viewer/buildInfo.ts`).
 *
 * @example
 * <DebugBar mode={plan?.mode} />
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@symbiot/ui/components/Badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@symbiot/ui/components/Tooltip";

import { type ViewerMode } from "../../shared/apiTypes.ts";

/** Props for the bottom-right debug bar. */
interface DebugBarProps {
  /** Viewer mode, undefined while the plan response is still in flight. */
  mode?: ViewerMode;
}

type CopyState = "idle" | "copied" | "failed";

/** Duration the badge shows the copy-confirmation state before reverting to idle. */
const copiedMs = 1200;

const ariaLabelFor = (state: CopyState): string => {
  if (state === "copied") return "Full SHA copied to clipboard";
  if (state === "failed") return "Copy failed";
  return `App version v${symbiotBuildInfo.version}, build ${symbiotBuildInfo.shaShort}. Activate to copy full SHA.`;
};

const badgeTextFor = (state: CopyState): string => {
  if (state === "copied") return "SHA copied";
  if (state === "failed") return "Copy failed";
  return `v${symbiotBuildInfo.version} · ${symbiotBuildInfo.shaShort}`;
};

export const DebugBar = ({ mode }: DebugBarProps): React.ReactElement => {
  const [state, setState] = useState<CopyState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleReset = useCallback((): void => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setState("idle"), copiedMs);
  }, []);

  const onCopy = useCallback((): void => {
    const { clipboard } = navigator;
    if (clipboard === undefined) {
      setState("failed");
      scheduleReset();
      return;
    }
    clipboard.writeText(symbiotBuildInfo.shaFull).then(
      () => {
        setState("copied");
        scheduleReset();
      },
      () => {
        setState("failed");
        scheduleReset();
      }
    );
  }, [scheduleReset]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    []
  );

  return (
    <div className="pointer-events-none fixed right-3 bottom-3 z-50">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge asChild variant="outline">
            <button
              type="button"
              onClick={onCopy}
              aria-label={ariaLabelFor(state)}
              aria-live="polite"
              className="bg-background/80 pointer-events-auto cursor-pointer font-mono tabular-nums backdrop-blur"
            >
              {badgeTextFor(state)}
            </button>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" align="end" className="max-w-[min(20rem,calc(100vw-1.5rem))]">
          <div className="flex flex-col gap-0.5 text-left">
            <span>v{symbiotBuildInfo.version}</span>
            <span className="font-mono text-xs break-all">SHA: {symbiotBuildInfo.shaFull}</span>
            <span className="text-xs break-all">Built: {symbiotBuildInfo.builtAt}</span>
            {mode !== undefined && <span className="text-xs">Mode: {mode}</span>}
            <span className="text-primary-foreground/70 text-xs">Click to copy SHA</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
