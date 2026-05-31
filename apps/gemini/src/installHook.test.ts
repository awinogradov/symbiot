import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

const homeRoot = await mkdtemp(join(tmpdir(), "symbiot-gemini-installhook-test-"));
process.env.HOME = homeRoot;

const { installHook, uninstallHook } = await import("./installHook.ts");

const settingsPath = join(homeRoot, ".gemini", "settings.json");

interface Hook {
  type: "command";
  command: string;
  name?: string;
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
  JSON.parse(await readFile(settingsPath, "utf8")) as Config;

const writeConfig = async (config: Config): Promise<void> => {
  await mkdir(join(homeRoot, ".gemini"), { recursive: true });
  await writeFile(settingsPath, JSON.stringify(config, null, 2), "utf8");
};

const symbiotEntriesIn = (config: Config, event: string): Hook[] =>
  (config.hooks?.[event] ?? []).flatMap((g) => g.hooks).filter((h) => /run-hook/.test(h.command));

describe("installHook", () => {
  beforeEach(async () => {
    await writeConfig({});
  });

  it("registers a single AfterAgent hook with a generous timeout in milliseconds", async () => {
    await installHook();
    const config = await readConfig();
    const entries = symbiotEntriesIn(config, "AfterAgent");
    expect(entries).toHaveLength(1);
    // Gemini hook timeouts are in MILLISECONDS (default 60000), so a 1-hour
    // review block is 3_600_000 — not the 3600 seconds Codex/Claude use.
    expect(entries[0]?.timeout).toBe(3_600_000);
    expect(entries[0]?.name).toBe("symbiot-gemini");
    expect(entries[0]?.command).toMatch(/run-hook$/);
  });

  it("is idempotent across repeat installs", async () => {
    await installHook();
    await installHook();
    const config = await readConfig();
    expect(symbiotEntriesIn(config, "AfterAgent")).toHaveLength(1);
  });

  it("preserves unrelated hooks under AfterAgent and other events", async () => {
    await writeConfig({
      hooks: {
        AfterAgent: [{ hooks: [{ type: "command", command: "other-afteragent-cmd" }] }],
        BeforeTool: [{ matcher: "write_file", hooks: [{ type: "command", command: "write-cmd" }] }],
      },
    });
    await installHook();
    const config = await readConfig();
    const afterCommands = (config.hooks?.AfterAgent ?? []).flatMap((g) =>
      g.hooks.map((h) => h.command)
    );
    const beforeCommands = (config.hooks?.BeforeTool ?? []).flatMap((g) =>
      g.hooks.map((h) => h.command)
    );
    expect(afterCommands).toContain("other-afteragent-cmd");
    expect(beforeCommands).toContain("write-cmd");
    expect(symbiotEntriesIn(config, "AfterAgent")).toHaveLength(1);
  });
});

describe("uninstallHook", () => {
  it("removes the symbiot AfterAgent entry and reports the count", async () => {
    await writeConfig({});
    await installHook();
    const { removed } = await uninstallHook();
    expect(removed).toBe(1);
    expect(symbiotEntriesIn(await readConfig(), "AfterAgent")).toHaveLength(0);
  });

  it("reports 0 removed when no symbiot entries exist", async () => {
    await writeConfig({});
    const { removed } = await uninstallHook();
    expect(removed).toBe(0);
  });
});
