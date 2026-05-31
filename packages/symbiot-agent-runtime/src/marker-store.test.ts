import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createMarkerStore } from "./marker-store.ts";

let dir: string;
let clock: number;
const now = (): number => clock;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "symbiot-marker-"));
  clock = 1_000_000;
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("createMarkerStore", () => {
  it("reports a recorded marker as fresh within the TTL", async () => {
    const store = createMarkerStore({ dir, ttlMs: 60_000, now });
    await store.record("session-1", "# Plan\n");
    clock += 30_000;
    expect(await store.isFresh("session-1", "# Plan\n")).toBe(true);
  });

  it("reports a marker as stale past the TTL", async () => {
    const store = createMarkerStore({ dir, ttlMs: 60_000, now });
    await store.record("session-1", "# Plan\n");
    clock += 60_001;
    expect(await store.isFresh("session-1", "# Plan\n")).toBe(false);
  });

  it("is not fresh when the marker timestamp is in the future", async () => {
    const store = createMarkerStore({ dir, ttlMs: 60_000, now });
    await store.record("session-1", "# Plan\n");
    clock -= 5_000; // clock rewound → marker is now future-dated
    expect(await store.isFresh("session-1", "# Plan\n")).toBe(false);
  });

  it("is not fresh when the payload differs", async () => {
    const store = createMarkerStore({ dir, ttlMs: 60_000, now });
    await store.record("session-1", "# Plan\n");
    expect(await store.isFresh("session-1", "# Other\n")).toBe(false);
  });

  it("is not fresh for an unrecorded key", async () => {
    const store = createMarkerStore({ dir, ttlMs: 60_000, now });
    expect(await store.isFresh("missing", "# Plan\n")).toBe(false);
  });

  it("honors a fixed fileName mapping", async () => {
    const store = createMarkerStore({
      dir,
      ttlMs: 60_000,
      now,
      fileName: () => "last-approve.json",
    });
    await store.record("ignored-key", "# Plan\n");
    expect(await store.isFresh("any-other-key", "# Plan\n")).toBe(true);
  });
});
