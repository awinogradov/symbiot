/**
 * Wire types shared between the Bun server (`src/server`) and the React client
 * (`src/client`). Keeping them in `src/shared` lets both tsconfig projects
 * include them without cross-project file references.
 */

/** Identifies a plan revision in `~/.symbiot/history/{project}/{slug}/00N.md`. */
export interface PlanMeta {
  project: string;
  slug: string;
  version: number;
  /**
   * Human-readable label rendered in the viewer's top bar. Resolved from git
   * context as `<repo> · <branch>` (or just `<repo>` on detached HEAD), with
   * `basename(cwd)` as a fallback when git is unavailable. Decoupled from
   * `project` so the on-disk slug stays stable across worktrees.
   */
  displayName: string;
}

/** Operating mode of the viewer. `plan` = Approve/Deny; `annotate` = Submit feedback. */
export type ViewerMode = "plan" | "annotate";

/** Response payload of `GET /api/plan`. */
export interface PlanResponse {
  plan: string;
  mode: ViewerMode;
  meta: PlanMeta;
}

/** Response payload of `GET /api/plan/versions`. */
export interface PlanVersionsResponse {
  versions: number[];
  current: number;
}

/** Response payload of `GET /api/plan/version?n=N`. */
export interface PlanVersionResponse {
  plan: string;
  meta: PlanMeta;
}

/**
 * Persisted reviewer draft. `GET /api/draft` returns this (or 204 when no draft
 * exists); `POST /api/draft` accepts the same shape. Maps are serialized as
 * plain objects on the wire and rebuilt client-side.
 *
 * `commentOriginalTexts` and `suggestionOriginalTexts` are optional so drafts
 * persisted by older viewer builds still load — those drafts walk without
 * drift signals. The `insertion*` and `replacement*` fields follow the same
 * back-compat rule.
 */
export interface DraftPayload {
  value: unknown[];
  commentBodies: Record<string, string>;
  commentImages?: Record<string, string[]>;
  commentOriginalTexts?: Record<string, string>;
  suggestionOriginalTexts?: Record<string, string>;
  /** Per-insertion proposed text + image refs + anchor snapshot. Optional for back-compat. */
  insertionNewTexts?: Record<string, string>;
  insertionImages?: Record<string, string[]>;
  insertionOriginalTexts?: Record<string, string>;
  /** Per-replacement proposed text + image refs + anchor snapshot. Optional for back-compat. */
  replacementTexts?: Record<string, string>;
  replacementImages?: Record<string, string[]>;
  replacementOriginalTexts?: Record<string, string>;
  globalComments: { id: string; body: string; images?: string[] }[];
  updatedAt: number;
}
