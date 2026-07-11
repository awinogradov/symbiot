import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeChild extends EventEmitter {
  unref: () => void;
}

const fakeChild = (): FakeChild => {
  const child = new EventEmitter() as FakeChild;
  child.unref = vi.fn();
  return child;
};

const spawnMock = vi.fn();

vi.mock("node:child_process", () => ({
  spawn: (...args: unknown[]) => spawnMock(...args) as ChildProcess,
}));

const homeRoot = await mkdtemp(join(tmpdir(), "symbiot-routes-test-"));
process.env.HOME = homeRoot;

const routesModule = await import("./routes.ts");
const { handleApi } = routesModule;
type RouteContext = Parameters<typeof handleApi>[2];

const { loadDraft, saveDraft, saveUpload, uploadPath, loadUpload } = await import("./storage.ts");

const project = "proj";
const slug = "plan";
const planDir = join(homeRoot, ".symbiot", "agents", "claude-code", "history", project, slug);

const ctx = (): RouteContext => ({
  plan: "boot plan",
  meta: { project, slug, version: 2, displayName: "Boot Plan" },
  agentId: "claude-code",
  mode: "plan",
  resolve: vi.fn(),
  isResolved: () => false,
  markResolved: vi.fn(),
});

const postVscodeDiff = (body: unknown): Promise<Response | null> => {
  const url = new URL("http://test/api/plan/vscode-diff");
  const req = new Request(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handleApi(req, url, ctx());
};

describe("POST /api/plan/vscode-diff", () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it("returns 400 when the body is missing or malformed", async () => {
    spawnMock.mockImplementation(() => {
      throw new Error("spawn should not be called on bad input");
    });
    const url = new URL("http://test/api/plan/vscode-diff");
    const req = new Request(url.toString(), { method: "POST" });
    const res = await handleApi(req, url, ctx());
    expect(res?.status).toBe(400);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns 400 when from/to are not positive integers", async () => {
    const res = await postVscodeDiff({ from: 0, to: 2 });
    expect(res?.status).toBe(400);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns 404 when a requested version file is missing", async () => {
    await mkdir(planDir, { recursive: true });
    await writeFile(join(planDir, "001.md"), "v1");
    // 002.md intentionally absent
    const res = await postVscodeDiff({ from: 1, to: 2 });
    expect(res?.status).toBe(404);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns 204 and spawns `code --diff` when both files exist", async () => {
    await mkdir(planDir, { recursive: true });
    await writeFile(join(planDir, "001.md"), "v1");
    await writeFile(join(planDir, "002.md"), "v2");
    const child = fakeChild();
    spawnMock.mockImplementation(() => {
      // Fire `spawn` on the next tick so the handler has time to attach the
      // listener that resolves the route promise.
      setImmediate(() => child.emit("spawn"));
      return child;
    });
    const res = await postVscodeDiff({ from: 1, to: 2 });
    expect(res?.status).toBe(204);
    expect(spawnMock).toHaveBeenCalledOnce();
    const [command, args] = spawnMock.mock.calls[0] ?? [];
    expect(command).toBe("code");
    expect(args).toEqual(["--diff", join(planDir, "001.md"), join(planDir, "002.md")]);
    expect(child.unref).toHaveBeenCalledOnce();
  });

  it("threads meta.displayName through /api/plan and /api/plan/version", async () => {
    await mkdir(planDir, { recursive: true });
    await writeFile(join(planDir, "001.md"), "older");
    await writeFile(join(planDir, "002.md"), "newer");

    const planUrl = new URL("http://test/api/plan");
    const planRes = await handleApi(new Request(planUrl.toString()), planUrl, ctx());
    expect(planRes?.status).toBe(200);
    const planBody = (await planRes?.json()) as { meta: { displayName?: string } };
    expect(planBody.meta.displayName).toBe("Boot Plan");

    const versionUrl = new URL("http://test/api/plan/version?n=1");
    const versionRes = await handleApi(new Request(versionUrl.toString()), versionUrl, ctx());
    expect(versionRes?.status).toBe(200);
    const versionBody = (await versionRes?.json()) as { meta: { displayName?: string } };
    expect(versionBody.meta.displayName).toBe("Boot Plan");
  });

  it("rewrites valid markdown image refs in feedback to absolute upload paths before persisting", async () => {
    const agentRoot = join(homeRoot, ".symbiot", "agents", "claude-code");
    const annotationDir = join(agentRoot, "annotations", project, slug);
    const uploadDir = join(agentRoot, "uploads", project, slug);
    await mkdir(uploadDir, { recursive: true });
    const validRef = "11111111-2222-4333-8444-555555555555.png";
    const invalidRef = "../etc/passwd";
    const feedbackMd = [
      "# Plan Feedback",
      "",
      '## 1. Feedback on: "x"',
      "> y",
      `> ![](${validRef})`,
      `> ![](${invalidRef})`,
      "",
    ].join("\n");
    const url = new URL("http://test/api/feedback");
    const req = new Request(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: feedbackMd }),
    });
    const res = await handleApi(req, url, ctx());
    expect(res?.status).toBe(204);
    const saved = await readFile(join(annotationDir, "001.md"), "utf8");
    const absolute = join(uploadDir, validRef);
    expect(saved).toContain(`> ![](${absolute})`);
    expect(saved).toContain(`> ![](${invalidRef})`);
  });

  it("returns 503 with `code-cli-missing` when `code` is not on PATH", async () => {
    await mkdir(planDir, { recursive: true });
    await writeFile(join(planDir, "001.md"), "v1");
    await writeFile(join(planDir, "002.md"), "v2");
    const child = fakeChild();
    const err = Object.assign(new Error("not found"), { code: "ENOENT" });
    spawnMock.mockImplementation(() => {
      setImmediate(() => child.emit("error", err));
      return child;
    });
    const res = await postVscodeDiff({ from: 1, to: 2 });
    expect(res?.status).toBe(503);
    expect(await res?.json()).toEqual({ reason: "code-cli-missing" });
  });
});

/** Build a context with a per-suite slug so each block's on-disk state is isolated. */
const ctxFor = (slugName: string, extra: Partial<RouteContext> = {}): RouteContext => ({
  ...ctx(),
  meta: { project, slug: slugName, version: 2, displayName: "Boot Plan" },
  ...extra,
});

const send = (
  method: string,
  path: string,
  routeCtx: RouteContext,
  init: RequestInit = {}
): Promise<Response | null> => {
  const url = new URL(`http://test${path}`);
  return handleApi(new Request(url.toString(), { method, ...init }), url, routeCtx);
};

describe("POST /api/approve", () => {
  it("resolves with an approve decision, marks resolved, and returns 204", async () => {
    const resolve = vi.fn();
    const markResolved = vi.fn();
    const res = await send("POST", "/api/approve", ctxFor("approve", { resolve, markResolved }));
    expect(res?.status).toBe(204);
    expect(markResolved).toHaveBeenCalledOnce();
    expect(resolve).toHaveBeenCalledWith({ kind: "approve" });
  });

  it("records the decision to decisionFile when one is configured", async () => {
    const decisionFile = join(homeRoot, "approve-decision.json");
    const res = await send("POST", "/api/approve", ctxFor("approve-file", { decisionFile }));
    expect(res?.status).toBe(204);
    const recorded = JSON.parse(await readFile(decisionFile, "utf8")) as {
      kind: string;
      at: number;
    };
    expect(recorded.kind).toBe("approve");
    expect(typeof recorded.at).toBe("number");
  });
});

describe("POST /api/deny", () => {
  it("resolves with a deny decision carrying the feedback body and returns 204", async () => {
    const resolve = vi.fn();
    const res = await send("POST", "/api/deny", ctxFor("deny", { resolve }), {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: "needs work" }),
    });
    expect(res?.status).toBe(204);
    expect(resolve).toHaveBeenCalledWith({ kind: "deny", feedback: "needs work" });
  });

  it("defaults to empty feedback when the body is missing or malformed", async () => {
    const resolve = vi.fn();
    const res = await send("POST", "/api/deny", ctxFor("deny-empty", { resolve }));
    expect(res?.status).toBe(204);
    expect(resolve).toHaveBeenCalledWith({ kind: "deny", feedback: "" });
  });
});

describe("GET /api/draft", () => {
  it("returns 204 when no draft is persisted", async () => {
    const res = await send("GET", "/api/draft", ctxFor("draft-absent"));
    expect(res?.status).toBe(204);
  });

  it("returns 200 with the persisted draft body", async () => {
    const routeCtx = ctxFor("draft-present");
    await saveDraft(routeCtx.agentId, routeCtx.meta, '{"annotations":[]}');
    const res = await send("GET", "/api/draft", routeCtx);
    expect(res?.status).toBe(200);
    expect(await res?.text()).toBe('{"annotations":[]}');
  });
});

describe("POST /api/draft", () => {
  it("persists the draft and returns 204 when the plan is unresolved", async () => {
    const routeCtx = ctxFor("draft-save");
    const res = await send("POST", "/api/draft", routeCtx, { body: '{"draft":1}' });
    expect(res?.status).toBe(204);
    expect(await loadDraft(routeCtx.agentId, routeCtx.meta)).toBe('{"draft":1}');
  });

  it("drops late writes without persisting once the plan is resolved", async () => {
    const routeCtx = ctxFor("draft-resolved", { isResolved: () => true });
    const res = await send("POST", "/api/draft", routeCtx, { body: '{"draft":2}' });
    expect(res?.status).toBe(204);
    expect(await loadDraft(routeCtx.agentId, routeCtx.meta)).toBeNull();
  });
});

describe("DELETE /api/draft", () => {
  it("clears the persisted draft and returns 204", async () => {
    const routeCtx = ctxFor("draft-delete");
    await saveDraft(routeCtx.agentId, routeCtx.meta, '{"draft":3}');
    const res = await send("DELETE", "/api/draft", routeCtx);
    expect(res?.status).toBe(204);
    expect(await loadDraft(routeCtx.agentId, routeCtx.meta)).toBeNull();
  });
});

describe("POST /api/upload", () => {
  const upload = (routeCtx: RouteContext, file: File | null): Promise<Response | null> => {
    const form = new FormData();
    if (file !== null) form.set("file", file);
    return send("POST", "/api/upload", routeCtx, { body: form });
  };

  it("returns 400 when the 'file' part is missing", async () => {
    const res = await upload(ctxFor("upload-missing"), null);
    expect(res?.status).toBe(400);
  });

  it("returns 400 for a non-whitelisted extension", async () => {
    const file = new File([new Uint8Array([1])], "evil.svg", { type: "image/svg+xml" });
    const res = await upload(ctxFor("upload-bad-ext"), file);
    expect(res?.status).toBe(400);
  });

  it("persists the bytes and returns a minted id for a valid image", async () => {
    const routeCtx = ctxFor("upload-ok");
    const file = new File([new Uint8Array([1, 2, 3])], "pic.png", { type: "image/png" });
    const res = await upload(routeCtx, file);
    expect(res?.status).toBe(200);
    const body = (await res?.json()) as { id: string; extension: string };
    expect(body.extension).toBe(".png");
    const saved = await loadUpload(uploadPath(routeCtx.agentId, routeCtx.meta, `${body.id}.png`));
    expect(saved).not.toBeNull();
  });
});

describe("GET /api/image", () => {
  const validId = "11111111-2222-4333-8444-555555555555";

  it("returns 400 for an invalid id", async () => {
    const res = await send("GET", "/api/image?id=not-a-uuid&ext=.png", ctxFor("image-bad"));
    expect(res?.status).toBe(400);
  });

  it("returns 400 for a non-whitelisted extension", async () => {
    const res = await send("GET", `/api/image?id=${validId}&ext=.svg`, ctxFor("image-bad-ext"));
    expect(res?.status).toBe(400);
  });

  it("returns 404 when the image is absent", async () => {
    const res = await send("GET", `/api/image?id=${validId}&ext=.png`, ctxFor("image-missing"));
    expect(res?.status).toBe(404);
  });

  it("returns 200 with the bytes and a typed Content-Type when present", async () => {
    const routeCtx = ctxFor("image-present");
    await saveUpload(
      uploadPath(routeCtx.agentId, routeCtx.meta, `${validId}.png`),
      new Uint8Array([7, 8, 9]).buffer
    );
    const res = await send("GET", `/api/image?id=${validId}&ext=.png`, routeCtx);
    expect(res?.status).toBe(200);
    expect(res?.headers.get("Content-Type")).toBe("image/png");
    expect(new Uint8Array(await (res as Response).arrayBuffer())).toEqual(
      new Uint8Array([7, 8, 9])
    );
  });
});

describe("POST /api/draft/send", () => {
  const jsonInit = (body: unknown): RequestInit => ({
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const historyDirFor = (slugName: string): string =>
    join(homeRoot, ".symbiot", "agents", "claude-code", "history", project, slugName);

  it("persists the body as the next version and resolves a draft decision", async () => {
    const dir = historyDirFor("draft-send");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "001.md"), "v1");
    await writeFile(join(dir, "002.md"), "boot plan");
    const resolve = vi.fn();
    const routeCtx = ctxFor("draft-send", { resolve });
    const res = await send("POST", "/api/draft/send", routeCtx, jsonInit({ markdown: "# Edited" }));
    expect(res?.status).toBe(204);
    const expectedPath = join(dir, "003.md");
    expect(await readFile(expectedPath, "utf8")).toBe("# Edited");
    expect(resolve).toHaveBeenCalledWith({ kind: "draft", path: expectedPath, version: 3 });
  });

  it("reuses the boot version without writing when the body is byte-identical", async () => {
    const dir = historyDirFor("draft-send-noop");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "002.md"), "boot plan");
    const resolve = vi.fn();
    const routeCtx = ctxFor("draft-send-noop", { resolve });
    const res = await send(
      "POST",
      "/api/draft/send",
      routeCtx,
      jsonInit({ markdown: "boot plan" })
    );
    expect(res?.status).toBe(204);
    expect(resolve).toHaveBeenCalledWith({ kind: "draft", path: join(dir, "002.md"), version: 2 });
    await expect(readFile(join(dir, "003.md"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("returns 400 on a missing or empty markdown body", async () => {
    const resolve = vi.fn();
    const routeCtx = ctxFor("draft-send-bad", { resolve });
    expect((await send("POST", "/api/draft/send", routeCtx))?.status).toBe(400);
    expect(
      (await send("POST", "/api/draft/send", routeCtx, jsonInit({ markdown: "  " })))?.status
    ).toBe(400);
    expect(resolve).not.toHaveBeenCalled();
  });

  it("returns 500 without resolving when the version write fails (server stays retryable)", async () => {
    // A FILE occupying the slug's history-directory path makes writeAtomic's
    // mkdir fail — the persistence error path, without mocking storage.
    await mkdir(join(homeRoot, ".symbiot", "agents", "claude-code", "history", project), {
      recursive: true,
    });
    await writeFile(historyDirFor("draft-send-fail"), "not a directory");
    const resolve = vi.fn();
    const markResolved = vi.fn();
    const routeCtx = ctxFor("draft-send-fail", { resolve, markResolved });
    const res = await send("POST", "/api/draft/send", routeCtx, jsonInit({ markdown: "# Edited" }));
    expect(res?.status).toBe(500);
    expect(await res?.json()).toMatchObject({ reason: "write-failed" });
    expect(resolve).not.toHaveBeenCalled();
    expect(markResolved).not.toHaveBeenCalled();
  });
});

describe("POST /api/approve with a draft body", () => {
  it("returns 400 when markdown is present but empty (never a silent path-less approve)", async () => {
    const resolve = vi.fn();
    const routeCtx = ctxFor("appr-empty", { resolve });
    const res = await send("POST", "/api/approve", routeCtx, {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown: "   " }),
    });
    expect(res?.status).toBe(400);
    expect(resolve).not.toHaveBeenCalled();
  });

  it("persists the body and resolves approve with the persisted path", async () => {
    const dir = join(homeRoot, ".symbiot", "agents", "claude-code", "history", project, "appr-md");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "002.md"), "boot plan");
    const resolve = vi.fn();
    const routeCtx = ctxFor("appr-md", { resolve });
    const res = await send("POST", "/api/approve", routeCtx, {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown: "# Final" }),
    });
    expect(res?.status).toBe(204);
    const expectedPath = join(dir, "003.md");
    expect(await readFile(expectedPath, "utf8")).toBe("# Final");
    expect(resolve).toHaveBeenCalledWith({ kind: "approve", path: expectedPath });
  });
});

describe("GET /api/plan/versions", () => {
  it("lists persisted version numbers and the current version", async () => {
    const routeCtx = ctxFor("versions");
    const dir = join(homeRoot, ".symbiot", "agents", "claude-code", "history", project, "versions");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "001.md"), "v1");
    await writeFile(join(dir, "002.md"), "v2");
    const res = await send("GET", "/api/plan/versions", routeCtx);
    expect(res?.status).toBe(200);
    expect(await res?.json()).toEqual({ versions: [1, 2], current: 2 });
  });
});
