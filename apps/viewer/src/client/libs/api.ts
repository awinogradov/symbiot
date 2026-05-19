/**
 * Client-side wrapper for `/api/*`. Each call validates the server response
 * with Zod at the boundary so the rest of the app deals with trusted shapes.
 */
import { z } from "zod";

import type { DraftPayload, PlanResponse } from "../../shared/apiTypes.ts";

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

const globalCommentSchema = z.object({
  id: z.string(),
  body: z.string(),
  images: z.array(z.string()).optional(),
});

const draftPayloadSchema = z.object({
  value: z.array(z.unknown()),
  commentBodies: z.record(z.string(), z.string()),
  commentImages: z.record(z.string(), z.array(z.string())).optional(),
  globalComments: z.array(globalCommentSchema),
  updatedAt: z.number(),
}) satisfies z.ZodType<DraftPayload>;

/** Fetch the plan + viewer mode for the current session. */
export const fetchPlan = async (): Promise<PlanResponse> => {
  const res = await fetch("/api/plan");
  if (!res.ok) throw new Error(`GET /api/plan failed: ${res.status}`);
  return planResponseSchema.parse(await res.json());
};

/** Approve the plan. Server records the decision and shuts down. */
export const postApprove = async (): Promise<void> => {
  const res = await fetch("/api/approve", { method: "POST" });
  if (!res.ok) throw new Error(`POST /api/approve failed: ${res.status}`);
};

/** Deny the plan (plan mode). Reviewer's free-text feedback travels in the body. */
export const postDeny = async (feedback: string): Promise<void> => {
  const res = await fetch("/api/deny", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feedback }),
  });
  if (!res.ok) throw new Error(`POST /api/deny failed: ${res.status}`);
};

/** Submit serialized annotation feedback (annotate mode). */
export const postFeedback = async (feedback: string): Promise<void> => {
  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feedback }),
  });
  if (!res.ok) throw new Error(`POST /api/feedback failed: ${res.status}`);
};

/** Load the persisted draft for this plan, or null when no draft exists. */
export const getDraft = async (): Promise<DraftPayload | null> => {
  const res = await fetch("/api/draft");
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`GET /api/draft failed: ${res.status}`);
  return draftPayloadSchema.parse(await res.json());
};

/** Persist the draft for this plan. Debounced by the caller. */
export const putDraft = async (draft: DraftPayload): Promise<void> => {
  const res = await fetch("/api/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  if (!res.ok) throw new Error(`POST /api/draft failed: ${res.status}`);
};

/** Remove the persisted draft for this plan. Idempotent on the server. */
export const deleteDraft = async (): Promise<void> => {
  const res = await fetch("/api/draft", { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE /api/draft failed: ${res.status}`);
};
