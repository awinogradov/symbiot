/**
 * Single source of truth for every `/api/*` endpoint the viewer exposes.
 * Imported by the client `apiClient` and the server's dispatch table so route
 * paths and methods never drift between the two halves.
 */

export type HttpMethod = "GET" | "POST" | "DELETE";

interface ApiRoute {
  method: HttpMethod;
  path: `/api/${string}`;
}

export const apiRoutes = {
  plan: { method: "GET", path: "/api/plan" },
  approve: { method: "POST", path: "/api/approve" },
  deny: { method: "POST", path: "/api/deny" },
  feedback: { method: "POST", path: "/api/feedback" },
  draftGet: { method: "GET", path: "/api/draft" },
  draftPut: { method: "POST", path: "/api/draft" },
  draftDelete: { method: "DELETE", path: "/api/draft" },
  upload: { method: "POST", path: "/api/upload" },
  image: { method: "GET", path: "/api/image" },
} as const satisfies Record<string, ApiRoute>;

export type ApiRouteId = keyof typeof apiRoutes;

/** `"GET /api/plan"`-style dispatch key — server keys its handler map by this. */
export const routeKey = (id: ApiRouteId): string => `${apiRoutes[id].method} ${apiRoutes[id].path}`;
