import { describe, expect, it } from "vitest";

import { resolveHookCommand } from "./hook-command.ts";

describe("resolveHookCommand", () => {
  it("returns the bare binary command when compiled (Bun $bunfs marker)", () => {
    expect(
      resolveHookCommand({
        importMetaUrl: "file:///$bunfs/root/installHook.ts",
        binName: "symbiot-codex",
      })
    ).toBe("symbiot-codex run-hook");
  });

  it("returns the bare binary command for the Windows ~BUN marker", () => {
    expect(
      resolveHookCommand({
        importMetaUrl: "file:///B:/~BUN/root/installHook.ts",
        binName: "symbiot-gemini",
      })
    ).toBe("symbiot-gemini run-hook");
  });

  it("resolves the sibling cli.ts from a real file URL in dev", () => {
    const command = resolveHookCommand({
      importMetaUrl: "file:///repo/apps/codex/src/installHook.ts",
      binName: "symbiot-codex",
    });
    expect(command).toBe("bun /repo/apps/codex/src/cli.ts run-hook");
  });

  it("matches the per-agent isSymbiotEntry bare form for each agent", () => {
    for (const binName of ["symbiot-codex", "symbiot-gemini", "symbiot-copilot"]) {
      expect(resolveHookCommand({ importMetaUrl: "file:///$bunfs/x.ts", binName })).toBe(
        `${binName} run-hook`
      );
    }
  });
});
