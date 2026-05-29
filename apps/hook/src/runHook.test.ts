import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

const homeRoot = await mkdtemp(join(tmpdir(), "symbiot-runhook-test-"));
process.env.HOME = homeRoot;

const {
  approveMarkerTtlMs,
  hashPlan,
  isFreshFor,
  markerPath,
  permissionRequestAllowPayload,
  readApproveMarker,
  writeApproveMarker,
} = await import("./runHook.ts");

const clearMarker = async (): Promise<void> => {
  await mkdir(dirname(markerPath()), { recursive: true });
  await rm(markerPath(), { force: true });
};

describe("hashPlan", () => {
  it("is deterministic and 64-char hex", () => {
    const hash = hashPlan("# Plan\n");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashPlan("# Plan\n")).toBe(hash);
  });

  it("differs across distinct inputs", () => {
    expect(hashPlan("a")).not.toBe(hashPlan("b"));
  });
});

describe("permissionRequestAllowPayload", () => {
  it("allows ExitPlanMode and switches the session to auto mode", () => {
    const { decision } = permissionRequestAllowPayload().hookSpecificOutput;
    expect(decision.behavior).toBe("allow");
    expect(decision.updatedPermissions).toContainEqual({
      type: "setMode",
      mode: "auto",
      destination: "session",
    });
  });
});

describe("approve marker round-trip", () => {
  beforeEach(async () => {
    await clearMarker();
  });

  it("write -> read returns the same planHash and a recent approvedAt", async () => {
    const planHash = hashPlan("# Plan\n");
    const before = Date.now();
    await writeApproveMarker(planHash);
    const after = Date.now();
    const marker = await readApproveMarker();
    expect(marker).not.toBeNull();
    expect(marker?.planHash).toBe(planHash);
    expect(marker?.approvedAt).toBeGreaterThanOrEqual(before);
    expect(marker?.approvedAt).toBeLessThanOrEqual(after);
  });

  it("returns null when the marker file is missing", async () => {
    expect(await readApproveMarker()).toBeNull();
  });

  it("returns null on malformed JSON", async () => {
    await writeFile(markerPath(), "{not-json", "utf8");
    expect(await readApproveMarker()).toBeNull();
  });

  it("returns null when planHash is not a 64-char hex string", async () => {
    await writeFile(
      markerPath(),
      JSON.stringify({ planHash: "short", approvedAt: Date.now() }),
      "utf8"
    );
    expect(await readApproveMarker()).toBeNull();
  });

  it("returns null when approvedAt is missing or non-numeric", async () => {
    const planHash = hashPlan("# Plan\n");
    await writeFile(markerPath(), JSON.stringify({ planHash, approvedAt: "now" }), "utf8");
    expect(await readApproveMarker()).toBeNull();
  });
});

describe("isFreshFor", () => {
  const planHash = hashPlan("# Plan\n");

  it("is true when planHash matches and marker is younger than the TTL", () => {
    const now = 1_000_000_000;
    expect(isFreshFor({ planHash, approvedAt: now - 1000 }, planHash, now)).toBe(true);
  });

  it("is false when planHash mismatches", () => {
    const now = 1_000_000_000;
    expect(isFreshFor({ planHash, approvedAt: now }, hashPlan("# Other\n"), now)).toBe(false);
  });

  it("is false when marker is older than the TTL", () => {
    const now = 1_000_000_000;
    expect(isFreshFor({ planHash, approvedAt: now - approveMarkerTtlMs - 1 }, planHash, now)).toBe(
      false
    );
  });

  it("is false exactly at the TTL boundary", () => {
    const now = 1_000_000_000;
    expect(isFreshFor({ planHash, approvedAt: now - approveMarkerTtlMs }, planHash, now)).toBe(
      false
    );
  });
});
