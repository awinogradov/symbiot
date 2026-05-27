import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const rootDir = dirname(fileURLToPath(import.meta.url));
const planDecisionFile = join(rootDir, ".features-generated", "last-decision.json");
const annotateDecisionFile = join(rootDir, ".features-generated", "annotate-decision.json");
const planPath = join(rootDir, "fixtures", "markdown", "elements.md");
const planPort = 3210;
const annotatePort = 3211;
const baseURL = `http://127.0.0.1:${planPort}`;

const testDir = defineBddConfig({
  features: ["features/**/*.feature"],
  steps: ["features/steps/**/*.ts", "features/support/**/*.ts"],
  outputDir: ".features-generated",
});

// Seed `001.md` so the viewer boots as version `002.md` with a real
// predecessor on disk. This is what `predecessor-diff.feature` asserts
// against — the "Compare with previous" button is by-design only visible
// when the boot version has a predecessor. CI starts from an empty
// `~/.symbiot/` and would otherwise boot as version 1, no predecessor,
// button correctly hidden, test incorrectly fails. `globalSetup` doesn't
// help because Playwright starts `webServer` before `globalSetup`; doing
// the seed inline in the command guarantees it runs first.
const historyDir =
  "$HOME/.symbiot/history/symbiot/example-plan-with-every-supported-markdown-element";

const viewerCommand = (port: number, decisionFile: string, mode: "plan" | "annotate"): string =>
  `mkdir -p "${historyDir}" && cp "${planPath}" "${historyDir}/001.md" && bun apps/viewer/src/bin.ts --plan ${planPath} --port ${port} --no-open --keep-alive --decision-file ${decisionFile} --mode ${mode}`;

export default defineConfig({
  testDir,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env["CI"] === "true" ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 800 },
    // DebugBar copies the build SHA to the clipboard on click; grant the
    // permission upfront so the success path is exercised in CI (headless
    // Chromium otherwise blocks `navigator.clipboard.writeText` without a
    // user gesture even on localhost).
    permissions: ["clipboard-read", "clipboard-write"],
  },
  webServer: [
    {
      command: viewerCommand(planPort, planDecisionFile, "plan"),
      url: baseURL,
      reuseExistingServer: process.env["CI"] !== "true",
      stdout: "pipe",
      stderr: "pipe",
      timeout: 30_000,
    },
    {
      command: viewerCommand(annotatePort, annotateDecisionFile, "annotate"),
      url: `http://127.0.0.1:${annotatePort}`,
      reuseExistingServer: process.env["CI"] !== "true",
      stdout: "pipe",
      stderr: "pipe",
      timeout: 30_000,
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
