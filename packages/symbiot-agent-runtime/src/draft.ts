/**
 * Shared `draft [file.md] [--slug <slug>]` flow for every agent integration.
 *
 * `draft` boots the viewer in the edit-first draft mode — blank seed or seeded
 * from a markdown file — blocks until the author acts, and reports the outcome
 * to the invoking coding agent as a single machine-parseable marker line on
 * stdout (the persisted `00N.md` file is the single source of truth; no
 * markdown body travels over stdout). The iteration loop is agent-mediated:
 * on a revision marker the agent refines the file and re-runs `draft` with the
 * emitted `--slug`, which keeps every revision in one version history so the
 * viewer can lead with the vN-1 → vN inline diff. The normative marker/exit
 * contract lives in `docs/03-server-contract.md`.
 *
 * @example
 * ```ts
 * import { runDraft } from "@symbiot/agent-runtime/draft";
 * import indexHtmlGz from "@symbiot/viewer/dist/embed/index.html.gz" with { type: "file" };
 * const exitCode = await runDraft({ argv, binName: "symbiot", agentId: "claude-code", indexHtmlGz });
 * ```
 */
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, dirname } from "node:path";

import type { RunningServer } from "@symbiot/viewer";

import { flagValue } from "./hook-input.ts";
import { runPlanReview, type RunPlanReviewOptions } from "./runPlanReview.ts";

type ReviewDecision = Awaited<RunningServer["resolved"]>;

/** First token of the stdout line emitted when the author sends a revision to the agent. */
export const draftRevisionMarker = "SYMBIOT_DRAFT_REVISION";
/** First token of the stdout line emitted when the author approves the draft as the agreed plan. */
export const draftApprovedMarker = "SYMBIOT_DRAFT_APPROVED";
/** Stdout line emitted when the review resolves without a draft outcome (cancelled). */
export const draftCancelledMarker = "SYMBIOT_DRAFT_CANCELLED";

/** Seed markdown for a blank draft session (no file argument). */
export const blankDraftSeed = "# Untitled draft\n";

/** Options for {@link runDraft}. */
export interface RunDraftOptions {
  /** Argv tail after the `draft` subcommand: `[file.md] [--slug <slug>]`. */
  argv: string[];
  /** Bin name used in usage/stderr lines (e.g. `symbiot`). */
  binName: string;
  /** Storage namespace passed to the viewer (e.g. `claude-code`). */
  agentId: string;
  /** The embedded viewer bundle, imported by the app with `{ type: "file" }`. */
  indexHtmlGz: string;
  /** Injection seam for tests; defaults to the real `@symbiot/viewer` `startServer`. */
  startServer?: RunPlanReviewOptions["startServer"];
}

const filePathFrom = (argv: string[]): string | undefined =>
  argv.find((arg, i) => !arg.startsWith("--") && argv[i - 1] !== "--slug");

/**
 * Resolve the session slug: an explicit `--slug` wins; a blank session mints a
 * unique slug so two untitled drafts never interleave in one history; a seeded
 * file defers to the viewer's H1-derived default (first boot only — every
 * marker echoes the resolved slug for the re-run).
 */
const slugFrom = (argv: string[], filePath: string | undefined): string | undefined => {
  const explicit = flagValue(argv, "--slug");
  if (explicit !== null) return explicit;
  return filePath === undefined ? `draft-${randomUUID().slice(0, 8)}` : undefined;
};

const emitDraftOutcome = (decision: ReviewDecision, binName: string): number => {
  if (decision.kind === "draft") {
    const slug = basename(dirname(decision.path));
    process.stdout.write(`${draftRevisionMarker} ${decision.path}\n`);
    process.stdout.write(`re-run after refining: ${binName} draft <refined.md> --slug ${slug}\n`);
    return 0;
  }
  if (decision.kind === "approve") {
    process.stdout.write(
      decision.path === undefined
        ? `${draftApprovedMarker}\n`
        : `${draftApprovedMarker} ${decision.path}\n`
    );
    return 0;
  }
  if (decision.kind === "deny") {
    process.stdout.write(`${draftCancelledMarker}\n`);
    return 2;
  }
  return 1;
};

/**
 * Boot the viewer in draft mode. Exits 0 with a `SYMBIOT_DRAFT_REVISION` or
 * `SYMBIOT_DRAFT_APPROVED` marker line, 2 with `SYMBIOT_DRAFT_CANCELLED` on a
 * cancelled review, 1 on any other resolution.
 */
export const runDraft = async ({
  argv,
  binName,
  agentId,
  indexHtmlGz,
  startServer,
}: RunDraftOptions): Promise<number> => {
  const filePath = filePathFrom(argv);
  const slug = slugFrom(argv, filePath);
  const plan = filePath === undefined ? blankDraftSeed : await readFile(filePath, "utf8");
  return runPlanReview({
    plan,
    mode: "draft",
    serverOptions: { indexHtmlGz, agentId, ...(slug === undefined ? {} : { slug }) },
    startServer,
    onStart: (url) =>
      process.stderr.write(`${binName}: draft ${filePath ?? "(blank)"} at ${url}\n`),
    onResolved: (decision) => emitDraftOutcome(decision, binName),
  });
};
