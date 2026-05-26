import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const homeRoot = await mkdtemp(join(tmpdir(), "symbiot-storage-test-"));
process.env.HOME = homeRoot;

const { extractPlanTitle, listVersions, resolveDisplayName } = await import("./storage.ts");

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

describe("extractPlanTitle", () => {
  it("returns the first H1 heading", () => {
    expect(extractPlanTitle("# Hello world\n\n## Body\n")).toBe("Hello world");
  });

  it("ignores H2+ headings", () => {
    expect(extractPlanTitle("## Pre-Implementation\n\n## Context\n")).toBeNull();
  });

  it("returns null when no heading is present", () => {
    expect(extractPlanTitle("just a paragraph\n")).toBeNull();
  });

  it("trims trailing whitespace from the title", () => {
    expect(extractPlanTitle("#   Padded Title   \n")).toBe("Padded Title");
  });
});

describe("resolveDisplayName", () => {
  const cwd = "/Users/me/projects/symbiot-worktrees/charming-dijkstra-832131";
  const noGit = { readCommonDir: () => null, readBranch: () => null };

  it("prefers the plan's H1 over git context", () => {
    const git = {
      readCommonDir: () => "/Users/me/projects/symbiot/.git",
      readBranch: () => "issue-56-a11y-aa-baseline",
    };
    expect(resolveDisplayName("# Hello world\n", cwd, git)).toBe("Hello world");
  });

  it("falls back to <repo> · <branch> when no H1 is present", () => {
    const git = {
      readCommonDir: () => "/Users/me/projects/symbiot/.git",
      readBranch: () => "issue-56-a11y-aa-baseline",
    };
    expect(resolveDisplayName("## Summary\n", cwd, git)).toBe(
      "symbiot · issue-56-a11y-aa-baseline"
    );
  });

  it("drops the branch suffix on detached HEAD", () => {
    const git = {
      readCommonDir: () => "/Users/me/projects/symbiot/.git",
      readBranch: () => "HEAD",
    };
    expect(resolveDisplayName("## Summary\n", cwd, git)).toBe("symbiot");
  });

  it("falls back to basename(cwd) when git is unavailable", () => {
    expect(resolveDisplayName("## Summary\n", cwd, noGit)).toBe("charming-dijkstra-832131");
  });

  it("resolves a relative --git-common-dir against cwd before extracting the repo name", () => {
    // Older git returns just `.git` when run from the working tree root.
    const git = {
      readCommonDir: () => ".git",
      readBranch: () => "main",
    };
    expect(resolveDisplayName("## Summary\n", "/Users/me/projects/symbiot", git)).toBe(
      "symbiot · main"
    );
  });
});
