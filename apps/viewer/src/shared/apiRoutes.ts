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
  planVersions: { method: "GET", path: "/api/plan/versions" },
  planVersion: { method: "GET", path: "/api/plan/version" },
  /**
   * Phase 4.3. Spawns VS Code (`code --diff <from> <to>`) on the host machine
   * so external agent integrations (VS Code / Obsidian extensions) can open a
   * native diff for two persisted plan versions. No in-app caller — humans use
   * the in-viewer diff overlay instead.
   */
  planVscodeDiff: { method: "POST", path: "/api/plan/vscode-diff" },
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
