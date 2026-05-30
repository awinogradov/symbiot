import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Integration tests for the POSIX `bin/symbiot` shim. They run a copy of the
 * real shim against a throwaway plugin root + data dir, stub `curl` on PATH to
 * serve a known fake "binary", and assert the shim installs and `exec`s it.
 *
 * Regression target (#157): a pre-0.3.0 shim left `.download.lock` as a regular
 * FILE; the new `mkdir` lock can never acquire over it, wedging every upgrade.
 */

const realShim = join(import.meta.dirname, "..", "bin", "symbiot");

// The fake binary the stubbed curl serves and the shim execs.
const fakeBinary = '#!/bin/sh\necho "FAKE_VIEWER_RAN:$*"\n';
const fakeSha = createHash("sha256").update(fakeBinary).digest("hex");

// Cover every triple so the shim's `uname`-derived lookup matches on any host.
const triples = ["darwin-arm64", "darwin-x64", "linux-x64", "windows-x64.exe"];
const sha256sums = `${triples.map((t) => `${fakeSha}  symbiot-${t}`).join("\n")}\n`;

interface Harness {
  shim: string;
  dataBin: string;
  lock: string;
  env: NodeJS.ProcessEnv;
}

const makeHarness = async (): Promise<Harness> => {
  const root = await mkdtemp(join(tmpdir(), "symbiot-shim-test-"));
  const home = join(root, "home");
  const dataDir = join(root, "data");
  const pluginBin = join(root, "plugin", "bin");
  const stubDir = join(root, "stub");
  const payload = join(root, "payload");
  for (const dir of [home, join(dataDir, "bin"), pluginBin, stubDir]) {
    mkdirSync(dir, { recursive: true });
  }

  // Run a copy of the shim so $0/.. resolves to our fixture plugin root.
  const shim = join(pluginBin, "symbiot");
  copyFileSync(realShim, shim);
  chmodSync(shim, 0o755);

  writeFileSync(join(pluginBin, "VERSION"), "v9.9.9\n");
  writeFileSync(join(pluginBin, "SHA256SUMS"), sha256sums);
  writeFileSync(payload, fakeBinary);

  // Stub curl: ignore the URL, copy the fake payload to curl's `-o` target.
  const curl = join(stubDir, "curl");
  writeFileSync(
    curl,
    '#!/bin/sh\nout=""\nprev=""\nfor a in "$@"; do\n  [ "$prev" = "-o" ] && out="$a"\n  prev="$a"\ndone\ncat "$SYMBIOT_TEST_PAYLOAD" > "$out"\n'
  );
  chmodSync(curl, 0o755);

  return {
    shim,
    dataBin: join(dataDir, "bin"),
    lock: join(dataDir, "bin", ".download.lock"),
    env: {
      ...process.env,
      HOME: home,
      CLAUDE_PLUGIN_DATA: dataDir,
      SYMBIOT_TEST_PAYLOAD: payload,
      PATH: `${stubDir}:${process.env.PATH ?? ""}`,
    },
  };
};

// SIGKILL (not the default SIGTERM, which the shim traps) so a reintroduced bug
// that wedges the waiter loop fails fast at the timeout instead of hanging.
const runShim = (h: Harness): ReturnType<typeof spawnSync> =>
  spawnSync(h.shim, ["run-hook"], {
    env: h.env,
    encoding: "utf8",
    timeout: 10_000,
    killSignal: "SIGKILL",
  });

describe("bin/symbiot download lock", () => {
  it("downloads and execs the binary on a cold cache", async () => {
    const h = await makeHarness();
    const result = runShim(h);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("FAKE_VIEWER_RAN:run-hook");
    expect(existsSync(h.lock)).toBe(false);
  }, 20_000);

  it("reaps a stale regular-file .download.lock and still installs+execs", async () => {
    const h = await makeHarness();
    // A pre-0.3.0 shim left the lock as a regular file (fd-redirect lock).
    writeFileSync(h.lock, "");
    expect(lstatSync(h.lock).isFile()).toBe(true);

    const result = runShim(h);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("FAKE_VIEWER_RAN:run-hook");
    expect(existsSync(h.lock)).toBe(false);
  }, 20_000);
});
