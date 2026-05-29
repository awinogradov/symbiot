import type { RunningServer, StartServerOptions } from "@symbiot/viewer";
import { describe, expect, it } from "vitest";

import { runPlanReview } from "./runPlanReview.ts";

type ReviewDecision = Awaited<RunningServer["resolved"]>;

interface StubState {
  stopped: boolean;
  startedUrl: string | null;
  receivedOptions: StartServerOptions | null;
}

const stubUrl = "http://127.0.0.1:0/";

const newState = (): StubState => ({ stopped: false, startedUrl: null, receivedOptions: null });

const stubStartServer =
  (decision: ReviewDecision, state: StubState) =>
  async (options: StartServerOptions): Promise<RunningServer> => {
    state.receivedOptions = options;
    return {
      url: stubUrl,
      meta: { project: "p", slug: "s", version: 1, displayName: "p" },
      resolved: Promise.resolve(decision),
      stop: async () => {
        state.stopped = true;
      },
    };
  };

describe("runPlanReview", () => {
  it("passes an approve decision to onResolved and returns its exit code", async () => {
    const state = newState();
    let received: ReviewDecision | null = null;
    const code = await runPlanReview({
      plan: "# Plan\n",
      startServer: stubStartServer({ kind: "approve" }, state),
      onResolved: (decision) => {
        received = decision;
        return 0;
      },
    });
    expect(code).toBe(0);
    expect(received).toEqual({ kind: "approve" });
  });

  it("passes a deny decision with feedback to onResolved", async () => {
    const state = newState();
    let received: ReviewDecision | null = null;
    const code = await runPlanReview({
      plan: "# Plan\n",
      startServer: stubStartServer({ kind: "deny", feedback: "needs work" }, state),
      onResolved: (decision) => {
        received = decision;
        return decision.kind === "deny" ? 0 : 1;
      },
    });
    expect(code).toBe(0);
    expect(received).toEqual({ kind: "deny", feedback: "needs work" });
  });

  it("passes an annotate feedback decision to onResolved", async () => {
    const state = newState();
    const code = await runPlanReview({
      plan: "# Doc\n",
      mode: "annotate",
      startServer: stubStartServer({ kind: "feedback", feedback: "note" }, state),
      onResolved: (decision) => (decision.kind === "feedback" ? 0 : 1),
    });
    expect(code).toBe(0);
  });

  it("awaits an async onResolved (marker-write style) before resolving", async () => {
    const state = newState();
    const code = await runPlanReview({
      plan: "# Plan\n",
      startServer: stubStartServer({ kind: "approve" }, state),
      onResolved: async (decision) => {
        await Promise.resolve();
        return decision.kind === "approve" ? 7 : 1;
      },
    });
    expect(code).toBe(7);
  });

  it("fires onStart with the viewer url and stops the server before dispatching", async () => {
    const state = newState();
    let startUrl: string | null = null;
    let stoppedAtDispatch = false;
    await runPlanReview({
      plan: "# Plan\n",
      startServer: stubStartServer({ kind: "approve" }, state),
      onStart: (url) => {
        startUrl = url;
      },
      onResolved: () => {
        stoppedAtDispatch = state.stopped;
        return 0;
      },
    });
    expect(startUrl).toBe(stubUrl);
    expect(stoppedAtDispatch).toBe(true);
  });

  it("forwards plan, mode, and serverOptions to startServer", async () => {
    const state = newState();
    await runPlanReview({
      plan: "# Plan\n",
      mode: "annotate",
      serverOptions: { indexHtmlGz: "/tmp/index.html.gz", port: 1234 },
      startServer: stubStartServer({ kind: "approve" }, state),
      onResolved: () => 0,
    });
    expect(state.receivedOptions).toEqual({
      plan: "# Plan\n",
      mode: "annotate",
      indexHtmlGz: "/tmp/index.html.gz",
      port: 1234,
    });
  });
});
