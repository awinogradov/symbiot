/**
 * Compile-time drift guard for `@symbiot/viewer`'s public, agent-facing surface.
 *
 * Each `Assert<Equals<live, snapshot>>` below fails to type-check the moment the
 * live contract in `../startServer.ts` / `../routes.ts` diverges from the pinned
 * baseline in {@link ./surface.snapshot.ts}. The file emits no runtime code; it
 * exists only so `tsc --noEmit` (the `@symbiot/viewer` `typecheck` script, and
 * the `turbo run typecheck` pipeline) enforces the contract.
 *
 * When `tsc` fails here, a viewer contract change has drifted from the snapshot.
 * If the change is intentional, regenerate `./surface.snapshot.ts` to match the
 * live types and land both in the same PR. If it is not, revert the change.
 */
import type { Decision, RunningServer, StartServerOptions, startServer } from "../startServer.ts";

import type {
  DecisionSnapshot,
  RunningServerSnapshot,
  StartServerOptionsSnapshot,
  StartServerSnapshot,
} from "./surface.snapshot.ts";

/** Invariant type equality (catches widening/narrowing in both directions). */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

type Assert<T extends true> = T;

type AssertStartServerOptions = Assert<Equals<StartServerOptions, StartServerOptionsSnapshot>>;
type AssertRunningServer = Assert<Equals<RunningServer, RunningServerSnapshot>>;
type AssertDecision = Assert<Equals<Decision, DecisionSnapshot>>;
type AssertStartServer = Assert<Equals<typeof startServer, StartServerSnapshot>>;

/** Exported so the assertions count as used and the guard is self-documenting. */
export type ContractAssertions = [
  AssertStartServerOptions,
  AssertRunningServer,
  AssertDecision,
  AssertStartServer,
];
