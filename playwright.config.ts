import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const rootDir = dirname(fileURLToPath(import.meta.url));
const decisionFile = join(rootDir, ".features-generated", "last-decision.json");
const planPath = join(rootDir, "fixtures", "plans", "elements.md");
const port = 3210;
const baseURL = `http://127.0.0.1:${port}`;

const testDir = defineBddConfig({
  features: ["features/**/*.feature"],
  steps: ["features/steps/**/*.ts", "features/support/**/*.ts"],
  outputDir: ".features-generated",
});

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
  },
  webServer: {
    command: `bun apps/viewer/src/bin.ts --plan ${planPath} --port ${port} --no-open --keep-alive --decision-file ${decisionFile}`,
    url: baseURL,
    reuseExistingServer: process.env["CI"] !== "true",
    stdout: "pipe",
    stderr: "pipe",
    timeout: 30_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
