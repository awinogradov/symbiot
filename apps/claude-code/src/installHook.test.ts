import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

const homeRoot = await mkdtemp(join(tmpdir(), "symbiot-installhook-test-"));
process.env.HOME = homeRoot;

const { installHook, uninstallHook } = await import("./installHook.ts");

const settingsPath = join(homeRoot, ".claude", "settings.json");

interface Hook {
  type: "command";
  command: string;
}
interface HookGroup {
  matcher?: string;
  hooks: Hook[];
}
interface Settings {
  hooks?: Record<string, HookGroup[]>;
  [key: string]: unknown;
}

const readSettings = async (): Promise<Settings> =>
  JSON.parse(await readFile(settingsPath, "utf8")) as Settings;

const writeSettings = async (settings: Settings): Promise<void> => {
  await mkdir(join(homeRoot, ".claude"), { recursive: true });
  await writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf8");
};

const symbiotEntriesIn = (settings: Settings, event: string): Hook[] =>
  (settings.hooks?.[event] ?? [])
    .filter((g) => g.matcher === "ExitPlanMode")
    .flatMap((g) => g.hooks)
    .filter((h) => /run-hook/.test(h.command));

describe("installHook", () => {
  beforeEach(async () => {
    await writeSettings({});
  });

  it("registers ExitPlanMode under both PreToolUse and PermissionRequest", async () => {
    await installHook();
    const settings = await readSettings();
    expect(symbiotEntriesIn(settings, "PreToolUse")).toHaveLength(1);
    expect(symbiotEntriesIn(settings, "PermissionRequest")).toHaveLength(1);
    expect(symbiotEntriesIn(settings, "PreToolUse")[0]?.command).toBe(
      symbiotEntriesIn(settings, "PermissionRequest")[0]?.command
    );
  });

  it("is idempotent across repeat installs", async () => {
    await installHook();
    await installHook();
    const settings = await readSettings();
    expect(symbiotEntriesIn(settings, "PreToolUse")).toHaveLength(1);
    expect(symbiotEntriesIn(settings, "PermissionRequest")).toHaveLength(1);
  });

  it("preserves unrelated hooks under the same events", async () => {
    await writeSettings({
      hooks: {
        PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "other-cmd" }] }],
        PermissionRequest: [{ matcher: "Edit", hooks: [{ type: "command", command: "edit-cmd" }] }],
      },
    });
    await installHook();
    const settings = await readSettings();
    const preCommands = (settings.hooks?.PreToolUse ?? []).flatMap((g) =>
      g.hooks.map((h) => h.command)
    );
    const permCommands = (settings.hooks?.PermissionRequest ?? []).flatMap((g) =>
      g.hooks.map((h) => h.command)
    );
    expect(preCommands).toContain("other-cmd");
    expect(permCommands).toContain("edit-cmd");
    expect(symbiotEntriesIn(settings, "PreToolUse")).toHaveLength(1);
    expect(symbiotEntriesIn(settings, "PermissionRequest")).toHaveLength(1);
  });

  it("strips deprecated Stop entries from earlier Phase-2 cuts", async () => {
    await writeSettings({
      hooks: {
        Stop: [
          {
            hooks: [{ type: "command", command: "bun /tmp/apps/hook/src/cli.ts run-hook" }],
          },
        ],
      },
    });
    await installHook();
    const settings = await readSettings();
    expect(symbiotEntriesIn(settings, "Stop")).toHaveLength(0);
    expect(symbiotEntriesIn(settings, "PreToolUse")).toHaveLength(1);
    expect(symbiotEntriesIn(settings, "PermissionRequest")).toHaveLength(1);
  });
});

describe("uninstallHook", () => {
  it("removes symbiot entries from both PreToolUse and PermissionRequest", async () => {
    await writeSettings({});
    await installHook();
    const { removed } = await uninstallHook();
    expect(removed).toBe(2);
    const settings = await readSettings();
    expect(symbiotEntriesIn(settings, "PreToolUse")).toHaveLength(0);
    expect(symbiotEntriesIn(settings, "PermissionRequest")).toHaveLength(0);
  });

  it("reports 0 removed when no symbiot entries exist", async () => {
    await writeSettings({});
    const { removed } = await uninstallHook();
    expect(removed).toBe(0);
  });
});
