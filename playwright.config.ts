import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const testDir = defineBddConfig({
  features: ["features/**/*.feature"],
  steps: ["features/steps/**/*.ts", "features/support/**/*.ts"],
  outputDir: ".features-generated",
});

/** CI worker count from `PLAYWRIGHT_WORKERS`, falling back to 3 on a missing/invalid value. */
const ciWorkers = (): number => {
  const parsed = Number(process.env["PLAYWRIGHT_WORKERS"] ?? 3);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3;
};

// Firefox/WebKit verify NFR-6 cross-engine support. They run only the @smoke subset
// and are gated off by default, so local `bun run test:e2e` stays Chromium-only (no
// firefox/webkit binaries required); CI sets CI=true, opt in locally with CROSS_BROWSER=1.
const crossBrowserEnabled = process.env["CI"] === "true" || process.env["CROSS_BROWSER"] === "1";

// Anchored to match the @smoke tag exactly, not @smoke-prefixed tags.
const smokeTag = /(?:^|\s)@smoke(?:\s|$)/;

export default defineConfig({
  testDir,
  // Each worker boots its own HOME-isolated viewers (see features/support/viewers.ts),
  // so scenarios carry no shared state and run fully in parallel. CI sizes workers from
  // the runner cores via PLAYWRIGHT_WORKERS (default 3, leaving a core for the OS + the
  // post-run coverage merge); local runs use half the cores.
  fullyParallel: true,
  workers: process.env["CI"] === "true" ? ciWorkers() : "50%",
  retries: 0,
  reporter: process.env["CI"] === "true" ? "github" : "list",
  use: {
    // baseURL is supplied per-worker by the `viewers` fixture (features/support/bdd.ts),
    // pointing each worker's `page` at its own plan viewer.
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // DebugBar copies the build SHA to the clipboard on click; grant the
        // permission upfront so the success path is exercised in CI (headless
        // Chromium otherwise blocks `navigator.clipboard.writeText` without a
        // user gesture even on localhost). These permission names are Chromium-only
        // (Firefox/WebKit reject them), so they stay scoped to this project.
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },
    // Cross-engine NFR-6 verification: the @smoke subset only, with no clipboard
    // permissions (Firefox/WebKit reject them) and no coverage (page.coverage is
    // Chromium-only — see features/support/bdd.ts).
    ...(crossBrowserEnabled
      ? [
          { name: "firefox", use: { ...devices["Desktop Firefox"] }, grep: smokeTag },
          { name: "webkit", use: { ...devices["Desktop Safari"] }, grep: smokeTag },
        ]
      : []),
  ],
});
