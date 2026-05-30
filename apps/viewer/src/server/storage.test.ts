import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const homeRoot = await mkdtemp(join(tmpdir(), "symbiot-storage-test-"));
process.env.HOME = homeRoot;

const {
  assertValidAgentId,
  listVersions,
  loadDraft,
  migrateLegacyTree,
  resolveDisplayName,
  saveDraft,
  savePlan,
} = await import("./storage.ts");

/** Point storage at a throwaway HOME so each test owns an isolated `~/.symbiot`. */
const freshHome = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "symbiot-storage-test-"));
  process.env.HOME = dir;
  return dir;
};

const project = "proj";
const slug = "plan";
const planDir = join(homeRoot, ".symbiot", "agents", "claude-code", "history", project, slug);

describe("listVersions", () => {
  it("returns [] when the plan directory is absent", async () => {
    expect(await listVersions("claude-code", { project: "missing", slug: "plan" })).toEqual([]);
  });

  it("returns NNN.md versions sorted ascending and ignores other files", async () => {
    await mkdir(planDir, { recursive: true });
    await writeFile(join(planDir, "002.md"), "v2");
    await writeFile(join(planDir, "001.md"), "v1");
    await writeFile(join(planDir, "010.md"), "v10");
    await writeFile(join(planDir, "draft.json"), "{}");
    await writeFile(join(planDir, "1.md"), "single-digit");

    expect(await listVersions("claude-code", { project, slug })).toEqual([1, 2, 10]);
  });
});

describe("resolveDisplayName", () => {
  const cwd = "/Users/me/projects/symbiot-worktrees/charming-dijkstra-832131";
  const noGit = { readCommonDir: () => null, readBranch: () => null };

  it("returns <repo> · <branch> from a worktree-shaped --git-common-dir", () => {
    const git = {
      readCommonDir: () => "/Users/me/projects/symbiot/.git",
      readBranch: () => "issue-56-a11y-aa-baseline",
    };
    expect(resolveDisplayName(cwd, git)).toBe("symbiot · issue-56-a11y-aa-baseline");
  });

  it("drops the branch suffix on detached HEAD", () => {
    const git = {
      readCommonDir: () => "/Users/me/projects/symbiot/.git",
      readBranch: () => "HEAD",
    };
    expect(resolveDisplayName(cwd, git)).toBe("symbiot");
  });

  it("falls back to basename(cwd) when git is unavailable", () => {
    expect(resolveDisplayName(cwd, noGit)).toBe("charming-dijkstra-832131");
  });

  it("resolves a relative --git-common-dir against cwd before extracting the repo name", () => {
    // Older git returns just `.git` when run from the working tree root.
    const git = {
      readCommonDir: () => ".git",
      readBranch: () => "main",
    };
    expect(resolveDisplayName("/Users/me/projects/symbiot", git)).toBe("symbiot · main");
  });
});

describe("assertValidAgentId", () => {
  it("accepts lowercase-alphanumeric slugs", () => {
    expect(() => assertValidAgentId("claude-code")).not.toThrow();
    expect(() => assertValidAgentId("codex")).not.toThrow();
  });

  it("rejects slugs that could escape the agents/ namespace", () => {
    for (const bad of ["", "..", "../evil", "Claude", "a/b", "-leading", "has space"]) {
      expect(() => assertValidAgentId(bad)).toThrow(/invalid agentId/);
    }
  });
});

describe("per-agent namespacing", () => {
  it("writes under agents/<agentId>/ and isolates same-slug plans across agents", async () => {
    const home = await freshHome();
    const codexMeta = await savePlan("codex", "# Shared Title", home);
    expect(await listVersions("codex", codexMeta)).toEqual([1]);
    // A different agent reviewing the same slug sees an empty, independent history.
    expect(await listVersions("claude-code", codexMeta)).toEqual([]);
    // The plan landed in the codex namespace on disk.
    const codexFile = join(
      home,
      ".symbiot",
      "agents",
      "codex",
      "history",
      codexMeta.project,
      codexMeta.slug,
      "001.md"
    );
    expect(await readFile(codexFile, "utf8")).toBe("# Shared Title");
  });

  it("isolates drafts per agent", async () => {
    await freshHome();
    const meta = { project, slug, version: 1, displayName: "Plan" };
    await saveDraft("codex", meta, '{"v":1}');
    expect(await loadDraft("codex", meta)).toBe('{"v":1}');
    expect(await loadDraft("claude-code", meta)).toBeNull();
  });
});

describe("migrateLegacyTree", () => {
  const legacySubdirs = ["history", "annotations", "drafts", "uploads"] as const;

  const seedLegacy = async (root: string): Promise<void> => {
    for (const sub of legacySubdirs) {
      await mkdir(join(root, sub, "proj"), { recursive: true });
      await writeFile(join(root, sub, "proj", "f.md"), sub);
    }
  };

  it("moves all four legacy trees into the claude-code namespace, idempotently", async () => {
    const home = await freshHome();
    const root = join(home, ".symbiot");
    await seedLegacy(root);

    await migrateLegacyTree();

    for (const sub of legacySubdirs) {
      const migrated = join(root, "agents", "claude-code", sub, "proj", "f.md");
      expect(await readFile(migrated, "utf8")).toBe(sub);
      await expect(stat(join(root, sub))).rejects.toMatchObject({ code: "ENOENT" });
    }

    // A second run is a no-op (no throw, migrated state intact).
    await migrateLegacyTree();
    const stillThere = join(root, "agents", "claude-code", "history", "proj", "f.md");
    expect(await readFile(stillThere, "utf8")).toBe("history");
  });

  it("never clobbers already-namespaced state if a legacy tree reappears", async () => {
    const home = await freshHome();
    const root = join(home, ".symbiot");
    const namespaced = join(root, "agents", "claude-code", "history", "proj");
    await mkdir(namespaced, { recursive: true });
    await writeFile(join(namespaced, "f.md"), "keep");
    // An old binary writes the flat tree again after migration already happened.
    await mkdir(join(root, "history", "proj"), { recursive: true });
    await writeFile(join(root, "history", "proj", "f.md"), "legacy");

    await migrateLegacyTree();

    expect(await readFile(join(namespaced, "f.md"), "utf8")).toBe("keep");
    expect(await readFile(join(root, "history", "proj", "f.md"), "utf8")).toBe("legacy");
  });

  it("tolerates concurrent boots racing the same rename without throwing", async () => {
    const home = await freshHome();
    const root = join(home, ".symbiot");
    await seedLegacy(root);

    // Two boots both pass the from-exists/to-absent guards; the rename loser
    // sees the source already gone (ENOENT) — that must be swallowed, not thrown.
    const results = await Promise.allSettled([migrateLegacyTree(), migrateLegacyTree()]);
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "fulfilled"]);

    for (const sub of legacySubdirs) {
      const migrated = join(root, "agents", "claude-code", sub, "proj", "f.md");
      expect(await readFile(migrated, "utf8")).toBe(sub);
    }
  });

  it("treats legacy trees as absent when ~/.symbiot is a file (ENOTDIR)", async () => {
    const home = await freshHome();
    // A file where the storage root should be makes stat() of any child throw
    // ENOTDIR; the migration must treat that as "absent", not crash the boot.
    await writeFile(join(home, ".symbiot"), "not a directory");
    await expect(migrateLegacyTree()).resolves.toBeUndefined();
  });
});
