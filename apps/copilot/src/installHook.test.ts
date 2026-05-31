import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

const homeRoot = await mkdtemp(join(tmpdir(), "symbiot-copilot-installhook-test-"));
process.env.HOME = homeRoot;

const { installHook, uninstallHook } = await import("./installHook.ts");

const hooksDir = join(homeRoot, ".copilot", "hooks");
const hookPath = join(hooksDir, "symbiot-copilot.json");

interface Hook {
  type: string;
  command: string;
  timeoutSec?: number;
  _managedBy?: string;
}
interface HookFile {
  version: number;
  hooks: { agentStop: Hook[] };
}

const readHookFile = async (): Promise<HookFile> =>
  JSON.parse(await readFile(hookPath, "utf8")) as HookFile;

beforeEach(async () => {
  await rm(hooksDir, { recursive: true, force: true });
});

describe("installHook", () => {
  it("writes a single agentStop command hook with a 3600s timeout and sentinel", async () => {
    const { path } = await installHook();
    expect(path).toBe(hookPath);
    const config = await readHookFile();
    expect(config.version).toBe(1);
    expect(config.hooks.agentStop).toHaveLength(1);
    const [entry] = config.hooks.agentStop;
    // Copilot hook timeouts are in SECONDS (default 30), so a 1-hour review block
    // is 3600 — not the 3_600_000 ms Gemini uses.
    expect(entry?.timeoutSec).toBe(3600);
    expect(entry?.type).toBe("command");
    expect(entry?.command).toMatch(/run-hook$/);
    expect(entry?._managedBy).toBe("symbiot-copilot");
  });

  it("is idempotent across repeat installs (byte-identical output)", async () => {
    await installHook();
    const first = await readFile(hookPath, "utf8");
    await installHook();
    expect(await readFile(hookPath, "utf8")).toBe(first);
  });
});

describe("uninstallHook", () => {
  it("removes symbiot's own hook file and reports removed:1", async () => {
    await installHook();
    const { removed } = await uninstallHook();
    expect(removed).toBe(1);
    await expect(access(hookPath)).rejects.toThrow();
  });

  it("reports removed:0 when no hook file exists", async () => {
    const { removed } = await uninstallHook();
    expect(removed).toBe(0);
  });

  it("leaves a hand-edited file (missing sentinel) untouched", async () => {
    await mkdir(hooksDir, { recursive: true });
    await writeFile(
      hookPath,
      JSON.stringify({
        version: 1,
        hooks: { agentStop: [{ type: "command", command: "user-cmd" }] },
      }),
      "utf8"
    );
    const { removed } = await uninstallHook();
    expect(removed).toBe(0);
    expect((await readHookFile()).hooks.agentStop[0]?.command).toBe("user-cmd");
  });
});
