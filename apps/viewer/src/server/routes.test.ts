import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
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

const project = "proj";
const slug = "plan";
const planDir = join(homeRoot, ".symbiot", "history", project, slug);

const ctx = (): RouteContext => ({
  plan: "boot plan",
  meta: { project, slug, version: 2, displayName: "Boot Plan" },
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
