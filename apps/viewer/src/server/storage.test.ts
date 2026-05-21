import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const homeRoot = await mkdtemp(join(tmpdir(), "symbiot-storage-test-"));
process.env.HOME = homeRoot;

const { listVersions } = await import("./storage.ts");

const project = "proj";
const slug = "plan";
const planDir = join(homeRoot, ".symbiot", "history", project, slug);

describe("listVersions", () => {
  it("returns [] when the plan directory is absent", async () => {
    expect(await listVersions({ project: "missing", slug: "plan" })).toEqual([]);
  });

  it("returns NNN.md versions sorted ascending and ignores other files", async () => {
    await mkdir(planDir, { recursive: true });
    await writeFile(join(planDir, "002.md"), "v2");
    await writeFile(join(planDir, "001.md"), "v1");
    await writeFile(join(planDir, "010.md"), "v10");
    await writeFile(join(planDir, "draft.json"), "{}");
    await writeFile(join(planDir, "1.md"), "single-digit");

    expect(await listVersions({ project, slug })).toEqual([1, 2, 10]);
  });
});
