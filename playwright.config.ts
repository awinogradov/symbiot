import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const testDir = defineBddConfig({
  features: ["features/**/*.feature"],
  steps: ["features/steps/**/*.ts", "features/support/**/*.ts"],
  outputDir: ".features-generated",
});

export default defineConfig({
  testDir,
  // Each worker boots its own HOME-isolated viewers (see features/support/viewers.ts),
  // so scenarios carry no shared state and run fully in parallel. CI sizes workers from
  // the runner cores via PLAYWRIGHT_WORKERS (default 3, leaving a core for the OS + the
  // post-run coverage merge); local runs use half the cores.
  fullyParallel: true,
  workers: process.env["CI"] === "true" ? Number(process.env["PLAYWRIGHT_WORKERS"] ?? 3) : "50%",
  retries: 0,
  reporter: process.env["CI"] === "true" ? "github" : "list",
  use: {
    // baseURL is supplied per-worker by the `viewers` fixture (features/support/bdd.ts),
    // pointing each worker's `page` at its own plan viewer.
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 800 },
    // DebugBar copies the build SHA to the clipboard on click; grant the
    // permission upfront so the success path is exercised in CI (headless
    // Chromium otherwise blocks `navigator.clipboard.writeText` without a
    // user gesture even on localhost).
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
