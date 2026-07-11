/**
 * Pinned snapshot of `@symbiot/viewer`'s public, agent-facing contract.
 *
 * This is the cross-workspace surface that `@symbiot/agent-runtime`
 * (`packages/symbiot-agent-runtime/src/runPlanReview.ts`) and
 * `apps/opencode-plugin` consume. The companion {@link ./surface.assert.ts}
 * compares the live types in `../startServer.ts` (and `../routes.ts`) against
 * the baseline below; any divergence fails
 * `bun run --filter @symbiot/viewer typecheck`, forcing a contract change to be
 * acknowledged in the same PR.
 *
 * The shapes are inlined (not re-imported from live source) on purpose — a
 * snapshot that referenced the live `PlanMeta`/`ViewerMode` would move together
 * with them and never detect drift. Nested shapes are pinned here too.
 *
 * To regenerate after an intentional change: copy the live definitions into the
 * matching declarations below, then re-run typecheck.
 */

/** Mirrors `ViewerMode` in `../../shared/apiTypes.ts`. */
export type ViewerModeSnapshot = "plan" | "annotate" | "draft";

/** Mirrors `PlanMeta` in `../../shared/apiTypes.ts`. */
export interface PlanMetaSnapshot {
  project: string;
  slug: string;
  version: number;
  displayName: string;
}

/** Mirrors `Decision` in `../routes.ts`. */
export type DecisionSnapshot =
  | { kind: "approve"; path?: string }
  | { kind: "deny"; feedback: string }
  | { kind: "feedback"; feedback: string }
  | { kind: "draft"; path: string; version: number };

/** Mirrors `StartServerOptions` in `../startServer.ts`. */
export interface StartServerOptionsSnapshot {
  plan: string;
  cwd?: string;
  openInBrowser?: boolean;
  staticRoot?: string;
  indexHtmlGz?: string;
  decisionFile?: string | null;
  port?: number | null;
  mode?: ViewerModeSnapshot;
  slug?: string;
  agentId?: string;
}

/** Mirrors `RunningServer` in `../startServer.ts`. */
export interface RunningServerSnapshot {
  url: string;
  meta: PlanMetaSnapshot;
  resolved: Promise<DecisionSnapshot>;
  stop: () => Promise<void>;
}

/** Mirrors the `startServer` function signature in `../startServer.ts`. */
export type StartServerSnapshot = (
  options: StartServerOptionsSnapshot
) => Promise<RunningServerSnapshot>;
