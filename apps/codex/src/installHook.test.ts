import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

const homeRoot = await mkdtemp(join(tmpdir(), "symbiot-codex-installhook-test-"));
process.env.HOME = homeRoot;

const { installHook, uninstallHook } = await import("./installHook.ts");

const hooksPath = join(homeRoot, ".codex", "hooks.json");

interface Hook {
  type: "command";
  command: string;
  timeout?: number;
}
interface HookGroup {
  matcher?: string;
  hooks: Hook[];
}
interface Config {
  hooks?: Record<string, HookGroup[]>;
  [key: string]: unknown;
}

const readConfig = async (): Promise<Config> =>
  JSON.parse(await readFile(hooksPath, "utf8")) as Config;

const writeConfig = async (config: Config): Promise<void> => {
  await mkdir(join(homeRoot, ".codex"), { recursive: true });
  await writeFile(hooksPath, JSON.stringify(config, null, 2), "utf8");
};

const symbiotEntriesIn = (config: Config, event: string): Hook[] =>
  (config.hooks?.[event] ?? []).flatMap((g) => g.hooks).filter((h) => /run-hook/.test(h.command));

describe("installHook", () => {
  beforeEach(async () => {
    await writeConfig({});
  });

  it("registers a single Stop hook with a generous timeout", async () => {
    await installHook();
    const config = await readConfig();
    const entries = symbiotEntriesIn(config, "Stop");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.timeout).toBe(3600);
    expect(entries[0]?.command).toMatch(/run-hook$/);
  });

  it("is idempotent across repeat installs", async () => {
    await installHook();
    await installHook();
    const config = await readConfig();
    expect(symbiotEntriesIn(config, "Stop")).toHaveLength(1);
  });

  it("preserves unrelated hooks under Stop and other events", async () => {
    await writeConfig({
      hooks: {
        Stop: [{ hooks: [{ type: "command", command: "other-stop-cmd" }] }],
        PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "bash-cmd" }] }],
      },
    });
    await installHook();
    const config = await readConfig();
    const stopCommands = (config.hooks?.Stop ?? []).flatMap((g) => g.hooks.map((h) => h.command));
    const preCommands = (config.hooks?.PreToolUse ?? []).flatMap((g) =>
      g.hooks.map((h) => h.command)
    );
    expect(stopCommands).toContain("other-stop-cmd");
    expect(preCommands).toContain("bash-cmd");
    expect(symbiotEntriesIn(config, "Stop")).toHaveLength(1);
  });
});

describe("uninstallHook", () => {
  it("removes the symbiot Stop entry and reports the count", async () => {
    await writeConfig({});
    await installHook();
    const { removed } = await uninstallHook();
    expect(removed).toBe(1);
    expect(symbiotEntriesIn(await readConfig(), "Stop")).toHaveLength(0);
  });

  it("reports 0 removed when no symbiot entries exist", async () => {
    await writeConfig({});
    const { removed } = await uninstallHook();
    expect(removed).toBe(0);
  });
});
