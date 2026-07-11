import { describe, expect, it, vi } from "vitest";

const { runDraftShared } = vi.hoisted(() => ({
  runDraftShared: vi.fn(async () => 0),
}));

vi.mock("@symbiot/agent-runtime/draft", () => ({ runDraft: runDraftShared }));
vi.mock("@symbiot/viewer/dist/embed/index.html.gz", () => ({
  default: "/embed/index.html.gz",
}));

const { runDraft } = await import("./runDraft.ts");

describe("runDraft binding", () => {
  it("forwards argv under the claude-code namespace with the embedded viewer bundle", async () => {
    const code = await runDraft(["file.md", "--slug", "pinned"]);
    expect(code).toBe(0);
    expect(runDraftShared).toHaveBeenCalledWith({
      argv: ["file.md", "--slug", "pinned"],
      binName: "symbiot",
      agentId: "claude-code",
      indexHtmlGz: "/embed/index.html.gz",
    });
  });
});
