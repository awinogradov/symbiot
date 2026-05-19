import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { When, Then } = createBdd();

const buildPng = (): Buffer =>
  Buffer.from(
    // 1x1 transparent PNG
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64"
  );

let lastUploadStatus = 0;
let lastUploadBody: { id?: string; extension?: string } | null = null;

const ensureRoot = (baseURL: string | undefined): string => {
  if (baseURL === undefined) throw new Error("baseURL not configured");
  return baseURL;
};

When("I POST a PNG to the upload endpoint", async ({ request, baseURL }) => {
  const root = ensureRoot(baseURL);
  const png = buildPng();
  const res = await request.post(`${root}/api/upload`, {
    multipart: { file: { name: "photo.png", mimeType: "image/png", buffer: png } },
  });
  lastUploadStatus = res.status();
  lastUploadBody = res.ok() ? ((await res.json()) as { id?: string; extension?: string }) : null;
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
  lastUploadStatus = res.status();
});

When("I POST a file with a traversal name to the upload endpoint", async ({ request, baseURL }) => {
  const root = ensureRoot(baseURL);
  const res = await request.post(`${root}/api/upload`, {
    multipart: {
      file: {
        name: "..\\evil\\path.png",
        mimeType: "image/png",
        buffer: buildPng(),
      },
    },
  });
  // The name is sanitized to a UUID before disk; the route accepts because
  // mintUuidFilename never touches the user's name. Path-traversal protection
  // is in unit tests (assertNoTraversal).
  lastUploadStatus = res.status();
  lastUploadBody = res.ok() ? ((await res.json()) as { id?: string; extension?: string }) : null;
});

// eslint-disable-next-line no-empty-pattern -- playwright-bdd requires object pattern
Then("the upload response status is {int}", ({}, status: number) => {
  expect(lastUploadStatus).toBe(status);
});

// eslint-disable-next-line no-empty-pattern -- playwright-bdd requires object pattern
Then("the upload response carries a canonical UUID v4", ({}) => {
  expect(lastUploadBody?.id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
});

Then("the uploaded image can be fetched back", async ({ request, baseURL }) => {
  const root = ensureRoot(baseURL);
  if (lastUploadBody === null) throw new Error("nothing uploaded");
  const res = await request.get(
    `${root}/api/image?id=${lastUploadBody.id}&ext=${lastUploadBody.extension}`
  );
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/");
});
