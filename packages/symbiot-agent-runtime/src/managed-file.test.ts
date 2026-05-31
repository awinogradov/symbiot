import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readOwnership, removeIfOwned, writeAtomic } from "./managed-file.ts";

const marker = "@managed-by symbiot-test";
const isOwned = (raw: string): boolean => raw.includes(marker);

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "symbiot-managed-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("writeAtomic", () => {
  it("creates the parent directory and writes the contents", async () => {
    const path = join(dir, "nested", "file.txt");
    await writeAtomic(path, `${marker}\n`);
    expect(await readFile(path, "utf8")).toBe(`${marker}\n`);
  });
});

describe("readOwnership", () => {
  it("classifies owned, foreign, and absent files", async () => {
    const owned = join(dir, "owned.txt");
    const foreign = join(dir, "foreign.txt");
    await writeFile(owned, `${marker}\n`, "utf8");
    await writeFile(foreign, "hand edited\n", "utf8");
    expect(await readOwnership(owned, isOwned)).toBe("ours");
    expect(await readOwnership(foreign, isOwned)).toBe("foreign");
    expect(await readOwnership(join(dir, "missing.txt"), isOwned)).toBe("absent");
  });
});

describe("removeIfOwned", () => {
  it("deletes an owned file and returns 1", async () => {
    const path = join(dir, "owned.txt");
    await writeFile(path, `${marker}\n`, "utf8");
    expect(await removeIfOwned(path, isOwned)).toBe(1);
    expect(await readOwnership(path, isOwned)).toBe("absent");
  });

  it("leaves a foreign file in place, returns 0, and invokes onForeign", async () => {
    const path = join(dir, "foreign.txt");
    await writeFile(path, "hand edited\n", "utf8");
    let warned = false;
    expect(
      await removeIfOwned(path, isOwned, () => {
        warned = true;
      })
    ).toBe(0);
    expect(warned).toBe(true);
    expect(await readOwnership(path, isOwned)).toBe("foreign");
  });

  it("returns 0 for an absent file", async () => {
    expect(await removeIfOwned(join(dir, "missing.txt"), isOwned)).toBe(0);
  });
});
