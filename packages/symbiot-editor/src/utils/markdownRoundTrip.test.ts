/**
 * NFR-4 gate for the draft mode's serialize-back path: markdown → Plate →
 * markdown must be semantically lossless, deterministic, and invisible to the
 * version diff.
 *
 * Canonical form: the first `serialize` pass MAY re-normalize byte-level
 * syntax the parser treats as equivalent (emphasis markers, list bullets,
 * fence style, wrapping). That normalized output is the canonical form — the
 * idempotency assertion pins that a second pass is byte-stable, and the
 * diff-cleanliness assertion pins that normalization can never surface as
 * phantom changes in the revision diff (the diff compares deserialized Plate
 * values, not markdown bytes).
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { MarkdownPlugin } from "@platejs/markdown";
import { createSlateEditor } from "platejs";
import { describe, expect, it } from "vitest";

import { computeDiffValue, hasAnyDiff } from "./diffPlugin.ts";
import { SymbiotDiffKit, SymbiotDraftKit } from "./kit.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/**
 * Every element class the viewer supports (elements.md) plus the golden
 * feedback bodies — tables, nested lists, task lists, code fences, quotes.
 */
const corpus = [
  "fixtures/markdown/elements.md",
  "fixtures/markdown/elements-revised.md",
  "fixtures/markdown/no-heading.md",
  "fixtures/golden/comment.md",
  "fixtures/golden/global-comment.md",
  "fixtures/golden/deletion.md",
  "fixtures/golden/insertion.md",
  "fixtures/golden/replacement.md",
  "fixtures/golden/mixed.md",
  "fixtures/golden/task.md",
];

const draftMd = createSlateEditor({ plugins: SymbiotDraftKit }).getApi(MarkdownPlugin).markdown;

describe.each(corpus)("markdown round-trip: %s", (fixture) => {
  const load = (): Promise<string> => readFile(join(repoRoot, fixture), "utf8");

  it("is semantically lossless (deserialize ∘ serialize is identity on Plate values)", async () => {
    const source = await load();
    const value = draftMd.deserialize(source);
    const serialized = draftMd.serialize({ value });
    expect(draftMd.deserialize(serialized)).toEqual(value);
  });

  it("serialize is idempotent (second pass is byte-stable)", async () => {
    const source = await load();
    const canonical = draftMd.serialize({ value: draftMd.deserialize(source) });
    const secondPass = draftMd.serialize({ value: draftMd.deserialize(canonical) });
    expect(secondPass).toBe(canonical);
  });

  it("normalization never surfaces in the version diff (zero diff ops)", async () => {
    const source = await load();
    const diffEditor = createSlateEditor({ plugins: SymbiotDiffKit });
    const md = diffEditor.getApi(MarkdownPlugin).markdown;
    const original = md.deserialize(source);
    const roundTripped = md.deserialize(draftMd.serialize({ value: original }));
    const diff = computeDiffValue(original, roundTripped, diffEditor);
    expect(hasAnyDiff(diff)).toBe(false);
  });
});
