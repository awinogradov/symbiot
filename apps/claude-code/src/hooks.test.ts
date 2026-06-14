import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

interface HookEntry {
  type: string;
  command: string;
  timeout?: number;
  statusMessage?: string;
}
interface HookGroup {
  matcher?: string;
  hooks: HookEntry[];
}
interface HooksConfig {
  hooks: Record<string, HookGroup[]>;
}

const hooksPath = join(import.meta.dirname, "..", "hooks", "hooks.json");

const readHooks = async (): Promise<HooksConfig> =>
  JSON.parse(await readFile(hooksPath, "utf8")) as HooksConfig;

const runHookEntriesFor = (config: HooksConfig, event: string): HookEntry[] =>
  (config.hooks[event] ?? [])
    .filter((group) => group.matcher === "ExitPlanMode")
    .flatMap((group) => group.hooks)
    .filter((entry) => /run-hook/.test(entry.command));

const symbiotEntries = (config: HooksConfig): HookEntry[] =>
  Object.values(config.hooks)
    .flat()
    .flatMap((group) => group.hooks)
    .filter((entry) => /bin\/symbiot|run-hook/.test(entry.command));

describe("hooks.json status messages", () => {
  // A cold-cache hook silently downloads the viewer; statusMessage is the only
  // signal Claude Code can show the user while the hook runs — see issue #220.
  it("every symbiot hook entry carries a non-empty statusMessage", async () => {
    const entries = symbiotEntries(await readHooks());

    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.statusMessage).toBeTruthy();
    }
  });
});

describe("hooks.json timeouts", () => {
  // run-hook blocks on the human reviewer, so its budget must cover an
  // open-ended review session plus a cold-cache download — see issue #151.
  it.each(["PreToolUse", "PermissionRequest"])(
    "%s(ExitPlanMode) run-hook entry has a 1-hour timeout",
    async (event) => {
      const config = await readHooks();
      const entries = runHookEntriesFor(config, event);

      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(entry.timeout).toBe(3600);
      }
    }
  );
});
