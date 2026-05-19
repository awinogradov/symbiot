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
}

/** Response payload of `GET /api/plan`. */
export interface PlanResponse {
  plan: string;
  mode: "plan";
  meta: PlanMeta;
}
