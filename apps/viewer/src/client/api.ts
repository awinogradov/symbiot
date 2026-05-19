import type { PlanResponse } from "../shared/api-types.ts";

export type { PlanResponse } from "../shared/api-types.ts";

export const fetchPlan = async (): Promise<PlanResponse> => {
  const res = await fetch("/api/plan");
  if (!res.ok) throw new Error(`GET /api/plan failed: ${res.status}`);
  return (await res.json()) as PlanResponse;
};

export const postApprove = async (): Promise<void> => {
  const res = await fetch("/api/approve", { method: "POST" });
  if (!res.ok) throw new Error(`POST /api/approve failed: ${res.status}`);
};

export const postDeny = async (feedback: string): Promise<void> => {
  const res = await fetch("/api/deny", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feedback }),
  });
  if (!res.ok) throw new Error(`POST /api/deny failed: ${res.status}`);
};

export const postFeedback = async (feedback: string): Promise<void> => {
  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feedback }),
  });
  if (!res.ok) throw new Error(`POST /api/feedback failed: ${res.status}`);
};

/** Server-side draft schema for `/api/draft`. */
export interface DraftPayload {
  value: unknown[];
  commentBodies: Record<string, string>;
  commentImages?: Record<string, string[]>;
  globalComments: { id: string; body: string; images?: string[] }[];
  updatedAt: number;
}

export const getDraft = async (): Promise<DraftPayload | null> => {
  const res = await fetch("/api/draft");
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`GET /api/draft failed: ${res.status}`);
  return (await res.json()) as DraftPayload;
};

export const putDraft = async (draft: DraftPayload): Promise<void> => {
  const res = await fetch("/api/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  if (!res.ok) throw new Error(`POST /api/draft failed: ${res.status}`);
};

export const deleteDraft = async (): Promise<void> => {
  const res = await fetch("/api/draft", { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE /api/draft failed: ${res.status}`);
};
