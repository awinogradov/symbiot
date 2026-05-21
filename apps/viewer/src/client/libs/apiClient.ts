/**
 * Client-side wrapper for `/api/*`. Dispatches through {@link apiRoutes} so no
 * route path or method appears as a string here. Responses are validated with
 * Zod at the boundary; the rest of the app deals with trusted shapes.
 */
import { z } from "zod";

import { apiRoutes, type ApiRouteId } from "../../shared/apiRoutes.ts";
import type {
  DraftPayload,
  PlanResponse,
  PlanVersionResponse,
  PlanVersionsResponse,
} from "../../shared/apiTypes.ts";

const planMetaSchema = z.object({
  project: z.string(),
  slug: z.string(),
  version: z.number().int(),
});

const planResponseSchema = z.object({
  plan: z.string(),
  mode: z.enum(["plan", "annotate"]),
  meta: planMetaSchema,
}) satisfies z.ZodType<PlanResponse>;

const planVersionsResponseSchema = z.object({
  versions: z.array(z.number().int()),
  current: z.number().int(),
}) satisfies z.ZodType<PlanVersionsResponse>;

const planVersionResponseSchema = z.object({
  plan: z.string(),
  meta: planMetaSchema,
}) satisfies z.ZodType<PlanVersionResponse>;

const globalCommentSchema = z.object({
  id: z.string(),
  body: z.string(),
  images: z.array(z.string()).optional(),
});

const draftPayloadSchema = z.object({
  value: z.array(z.unknown()),
  commentBodies: z.record(z.string(), z.string()),
  commentImages: z.record(z.string(), z.array(z.string())).optional(),
  commentOriginalTexts: z.record(z.string(), z.string()).optional(),
  suggestionOriginalTexts: z.record(z.string(), z.string()).optional(),
  globalComments: z.array(globalCommentSchema),
  updatedAt: z.number(),
}) satisfies z.ZodType<DraftPayload>;

interface RequestOptions<T> {
  /** Zod schema to parse the response with. `null` means: ignore the body. */
  schema: z.ZodType<T> | null;
  body?: unknown;
  query?: Record<string, string>;
}

const buildUrl = (path: string, query?: Record<string, string>): string => {
  if (query === undefined) return path;
  const params = new URLSearchParams(query);
  const qs = params.toString();
  return qs.length > 0 ? `${path}?${qs}` : path;
};

const request = async <T>(id: ApiRouteId, opts: RequestOptions<T>): Promise<T> => {
  const { method, path } = apiRoutes[id];
  const init: RequestInit = { method };
  if (opts.body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(opts.body);
  }
  const res = await fetch(buildUrl(path, opts.query), init);
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status}`);
  if (opts.schema === null) return undefined as T;
  // 204 No Content is a valid "absent" signal for nullable schemas (e.g. draft).
  if (res.status === 204) return opts.schema.parse(null);
  return opts.schema.parse(await res.json());
};

/** Fetch the plan + viewer mode for the current session. */
export const fetchPlan = (): Promise<PlanResponse> =>
  request("plan", { schema: planResponseSchema });

/** List every plan version persisted on disk, plus the version currently in session. */
export const fetchPlanVersions = (): Promise<PlanVersionsResponse> =>
  request("planVersions", { schema: planVersionsResponseSchema });

/** Load a specific plan version's markdown by version number. */
export const fetchPlanVersion = (version: number): Promise<PlanVersionResponse> =>
  request("planVersion", {
    schema: planVersionResponseSchema,
    query: { n: String(version) },
  });

/** Approve the plan. Server records the decision and shuts down. */
export const postApprove = (): Promise<void> => request("approve", { schema: null });

/** Deny the plan (plan mode). Reviewer's free-text feedback travels in the body. */
export const postDeny = (feedback: string): Promise<void> =>
  request("deny", { schema: null, body: { feedback } });

/** Submit serialized annotation feedback (annotate mode). */
export const postFeedback = (feedback: string): Promise<void> =>
  request("feedback", { schema: null, body: { feedback } });

/** Load the persisted draft for this plan, or null when no draft exists. */
export const getDraft = (): Promise<DraftPayload | null> =>
  request("draftGet", { schema: draftPayloadSchema.nullable() });

/** Persist the draft for this plan. Debounced by the caller. */
export const putDraft = (draft: DraftPayload): Promise<void> =>
  request("draftPut", { schema: null, body: draft });

/** Remove the persisted draft for this plan. Idempotent on the server. */
export const deleteDraft = (): Promise<void> => request("draftDelete", { schema: null });
