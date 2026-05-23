import { describe, expect, it } from "vitest";

import { resolveBuildInfo, type BuildInfoReaders } from "./buildInfo.ts";

const fixedDate = new Date("2026-05-23T17:48:02.000Z");

const makeReaders = (overrides: Partial<BuildInfoReaders> = {}): BuildInfoReaders => ({
  readPluginVersion: () => "0.1.0",
  readGitSha: (kind) => (kind === "short" ? "a1b2c3d" : "a1b2c3def1234567890abcdef1234567890abcd"),
  now: () => fixedDate,
  ...overrides,
});

describe("resolveBuildInfo", () => {
  it("returns version, short SHA, full SHA, and ISO timestamp", () => {
    expect(resolveBuildInfo(makeReaders())).toEqual({
      version: "0.1.0",
      shaShort: "a1b2c3d",
      shaFull: "a1b2c3def1234567890abcdef1234567890abcd",
      builtAt: "2026-05-23T17:48:02.000Z",
    });
  });

  it("falls back to 'dev' for both short and full SHA when git is unavailable", () => {
    const info = resolveBuildInfo(makeReaders({ readGitSha: () => null }));
    expect(info.shaShort).toBe("dev");
    expect(info.shaFull).toBe("dev");
  });

  it("propagates a missing-version error from the plugin.json reader", () => {
    const readers = makeReaders({
      readPluginVersion: () => {
        throw new Error('plugin.json missing "version" field: /path/to/plugin.json');
      },
    });
    expect(() => resolveBuildInfo(readers)).toThrow(/missing "version" field/);
  });

  it("propagates an empty-version error from the plugin.json reader", () => {
    const readers = makeReaders({
      readPluginVersion: () => {
        throw new Error('plugin.json "version" must be a non-empty string: /path/to/plugin.json');
      },
    });
    expect(() => resolveBuildInfo(readers)).toThrow(/non-empty string/);
  });

  it("propagates a malformed-JSON error from the plugin.json reader", () => {
    const readers = makeReaders({
      readPluginVersion: () => {
        throw new Error("failed to parse JSON at /path/to/plugin.json: Unexpected token");
      },
    });
    expect(() => resolveBuildInfo(readers)).toThrow(/failed to parse JSON/);
  });
});
