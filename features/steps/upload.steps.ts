import { expect, type APIRequestContext } from "@playwright/test";

import { Then, When } from "../support/bdd.ts";
import { transparentPng } from "../support/testAssets.ts";

interface UploadState {
  status: number;
  body: { id?: string; extension?: string } | null;
}

/**
 * Per-request-context state for upload scenarios. Keyed by the Playwright
 * `APIRequestContext` so each scenario's writes stay isolated (mirrors the
 * `WeakMap<Page, …>` pattern in `draft.steps.ts` / `versionHistory.steps.ts`).
 * Module-level `let` was the previous shape and tripped on worker reuse.
 */
const uploadStateByRequest = new WeakMap<APIRequestContext, UploadState>();

const getState = (request: APIRequestContext): UploadState => {
  let state = uploadStateByRequest.get(request);
  if (state === undefined) {
    state = { status: 0, body: null };
    uploadStateByRequest.set(request, state);
  }
  return state;
};

const ensureRoot = (baseURL: string | undefined): string => {
  if (baseURL === undefined) throw new Error("baseURL not configured");
  return baseURL.replace(/\/$/, "");
};

When("I POST a PNG to the upload endpoint", async ({ request, baseURL }) => {
  const root = ensureRoot(baseURL);
  const png = transparentPng();
  const res = await request.post(`${root}/api/upload`, {
    multipart: { file: { name: "photo.png", mimeType: "image/png", buffer: png } },
  });
  const state = getState(request);
  state.status = res.status();
  state.body = res.ok() ? ((await res.json()) as { id?: string; extension?: string }) : null;
});

When("I POST an executable to the upload endpoint", async ({ request, baseURL }) => {
  const root = ensureRoot(baseURL);
  const res = await request.post(`${root}/api/upload`, {
    multipart: {
      file: {
        name: "payload.exe",
        mimeType: "application/octet-stream",
        buffer: Buffer.from("MZ"),
      },
    },
  });
  getState(request).status = res.status();
});

When("I POST a file with a traversal name to the upload endpoint", async ({ request, baseURL }) => {
  const root = ensureRoot(baseURL);
  const res = await request.post(`${root}/api/upload`, {
    multipart: {
      file: {
        name: "..\\evil\\path.png",
        mimeType: "image/png",
        buffer: transparentPng(),
      },
    },
  });
  // The name is sanitized to a UUID before disk; the route accepts because
  // mintUuidFilename never touches the user's name. Path-traversal protection
  // is in unit tests (assertNoTraversal).
  const state = getState(request);
  state.status = res.status();
  state.body = res.ok() ? ((await res.json()) as { id?: string; extension?: string }) : null;
});

Then("the upload response status is {int}", ({ request }, status: number) => {
  expect(getState(request).status).toBe(status);
});

Then("the upload response carries a canonical UUID v4", ({ request }) => {
  expect(getState(request).body?.id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
});

Then("the uploaded image can be fetched back", async ({ request, baseURL }) => {
  const root = ensureRoot(baseURL);
  const { body } = getState(request);
  if (body === null) throw new Error("nothing uploaded");
  const res = await request.get(`${root}/api/image?id=${body.id}&ext=${body.extension}`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/");
});
