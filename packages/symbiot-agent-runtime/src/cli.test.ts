import { afterEach, describe, expect, it, vi } from "vitest";

import { createCli } from "./cli.ts";

const captureStderr = (): { calls: () => string[] } => {
  const spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  return { calls: () => spy.mock.calls.map((c) => String(c[0])) };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createCli dispatch", () => {
  it("routes a command to its handler with the argv tail and returns its code", async () => {
    let received: string[] | null = null;
    const { dispatch } = createCli({
      binName: "symbiot-codex",
      usageCommands: "<run-hook>",
      handlers: {
        "run-hook": (argv) => {
          received = argv;
          return 0;
        },
      },
    });
    expect(await dispatch(["run-hook", "--no-open"])).toBe(0);
    expect(received).toEqual(["--no-open"]);
  });

  it("returns 64 and prints usage for an unknown command", async () => {
    const err = captureStderr();
    const { dispatch } = createCli({
      binName: "symbiot-codex",
      usageCommands: "<run-hook|annotate <file.md>>",
      handlers: { "run-hook": () => 0 },
    });
    expect(await dispatch(["bogus"])).toBe(64);
    expect(err.calls()).toEqual(["usage: symbiot-codex <run-hook|annotate <file.md>>\n"]);
  });

  it("returns 64 for an empty argv (no command)", async () => {
    captureStderr();
    const { dispatch } = createCli({
      binName: "symbiot-codex",
      usageCommands: "<run-hook>",
      handlers: { "run-hook": () => 0 },
    });
    expect(await dispatch([])).toBe(64);
  });

  it("propagates a handler rejection so run() maps it to exit 1", async () => {
    const { dispatch } = createCli({
      binName: "symbiot-codex",
      usageCommands: "<run-hook>",
      handlers: {
        "run-hook": () => {
          throw new Error("boom");
        },
      },
    });
    await expect(dispatch(["run-hook"])).rejects.toThrow("boom");
  });
});

const flushMicrotasks = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe("createCli run", () => {
  it("exits with the handler's code", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    createCli({
      binName: "symbiot-codex",
      usageCommands: "<run-hook>",
      handlers: { "run-hook": () => 0 },
    }).run(["run-hook"]);
    await flushMicrotasks();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("prints the error message and exits 1 when a handler throws", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const err = captureStderr();
    createCli({
      binName: "symbiot-codex",
      usageCommands: "<run-hook>",
      handlers: {
        "run-hook": () => {
          throw new Error("boom");
        },
      },
    }).run(["run-hook"]);
    await flushMicrotasks();
    expect(err.calls()).toContain("boom\n");
    expect(exit).toHaveBeenCalledWith(1);
  });
});
