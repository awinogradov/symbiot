import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createConfigHookInstaller } from "./config-installer.ts";

const command = "bun /abs/apps/codex/src/cli.ts run-hook";
const isSymbiotEntry = (c: string): boolean =>
  /apps\/codex\/(src|dist)\/cli\.(ts|js).*run-hook/.test(c) || c === "symbiot-codex run-hook";

let dir: string;
let path: string;

const readJson = async (): Promise<{
  hooks?: Record<string, { matcher?: string; hooks: { command: string }[] }[]>;
}> => JSON.parse(await readFile(path, "utf8"));

const codexInstaller = () =>
  createConfigHookInstaller({
    path,
    cliCommand: () => command,
    isSymbiotEntry,
    registerEvents: ["Stop"],
    entryExtras: { timeout: 3600 },
  });

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "symbiot-installer-"));
  path = join(dir, "hooks.json");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("createConfigHookInstaller (single-event, codex-style)", () => {
  it("registers the symbiot entry with its timeout", async () => {
    const { installHook } = codexInstaller();
    const result = await installHook();
    expect(result).toEqual({ path, command });
    const config = await readJson();
    expect(config.hooks?.Stop).toEqual([{ hooks: [{ type: "command", command, timeout: 3600 }] }]);
  });

  it("is idempotent — re-install does not duplicate the entry", async () => {
    const { installHook } = codexInstaller();
    await installHook();
    await installHook();
    const config = await readJson();
    expect(config.hooks?.Stop?.flatMap((g) => g.hooks)).toHaveLength(1);
  });

  it("preserves foreign entries and other events", async () => {
    await writeFile(
      path,
      JSON.stringify({
        hooks: {
          Stop: [{ hooks: [{ type: "command", command: "other-tool run" }] }],
          PreToolUse: [{ hooks: [{ type: "command", command: "keep-me" }] }],
        },
      }),
      "utf8"
    );
    await codexInstaller().installHook();
    const config = await readJson();
    expect(config.hooks?.Stop?.flatMap((g) => g.hooks.map((h) => h.command))).toEqual([
      "other-tool run",
      command,
    ]);
    expect(config.hooks?.PreToolUse?.flatMap((g) => g.hooks.map((h) => h.command))).toEqual([
      "keep-me",
    ]);
  });

  it("uninstall removes only symbiot entries across events", async () => {
    const { installHook, uninstallHook } = codexInstaller();
    await installHook();
    const result = await uninstallHook();
    expect(result.removed).toBe(1);
    const config = await readJson();
    expect(config.hooks?.Stop ?? []).toEqual([]);
  });

  it("uninstall reports 0 removed when nothing is installed", async () => {
    await writeFile(path, JSON.stringify({ hooks: {} }), "utf8");
    expect((await codexInstaller().uninstallHook()).removed).toBe(0);
  });
});

describe("createConfigHookInstaller (multi-event + matcher, claude-code-style)", () => {
  const claudeInstaller = () =>
    createConfigHookInstaller({
      path,
      cliCommand: () => command,
      isSymbiotEntry,
      registerEvents: ["PreToolUse", "PermissionRequest"],
      cleanEvents: ["Stop"],
      matcher: "ExitPlanMode",
    });

  it("registers the matcher group under both events with no timeout", async () => {
    await claudeInstaller().installHook();
    const config = await readJson();
    const group = { matcher: "ExitPlanMode", hooks: [{ type: "command", command }] };
    expect(config.hooks?.PreToolUse).toEqual([group]);
    expect(config.hooks?.PermissionRequest).toEqual([group]);
    expect(config.hooks?.Stop).toEqual([]);
  });
});
