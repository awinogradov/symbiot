/**
 * Guards the inline pre-paint script contract for `apps/viewer/index.html` —
 * the script must remain inline, in `<head>`, before the module script, with
 * the documented API surface (`symbiot.theme`, `matchMedia`,
 * `documentElement.classList`, `style.colorScheme`). Without this script,
 * `<body>` paints against the light-mode `--background` before React mounts,
 * producing a visible flash on dark-mode systems.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const htmlPath = join(import.meta.dirname, "..", "..", "index.html");
const html = await readFile(htmlPath, "utf8");

const headOpen = html.indexOf("<head>");
const headClose = html.indexOf("</head>");
const inlineIndex = html.indexOf("<script>try{");
const moduleIndex = html.indexOf('<script type="module"');
const body = html.match(/<script>(try\{[^]*?)<\/script>/)?.[1] ?? "";

describe("apps/viewer/index.html pre-paint script", () => {
  it("inlines before the module script as the first <script> in the document", () => {
    expect(headOpen).toBeGreaterThanOrEqual(0);
    expect(headClose).toBeGreaterThan(headOpen);
    expect(inlineIndex).toBeGreaterThanOrEqual(headOpen);
    expect(inlineIndex).toBeLessThan(headClose);
    expect(inlineIndex).toBeLessThan(moduleIndex);
    expect(html.indexOf("<script>")).toBe(inlineIndex);
  });

  it("references the documented API surface and sets colorScheme on both branches", () => {
    expect(body).toContain("localStorage.getItem('symbiot.theme')");
    expect(body).toContain("(prefers-color-scheme: dark)");
    expect(body).toContain("document.documentElement.classList");
    expect(body).toMatch(/style\.colorScheme\s*=\s*[^?]+\?\s*['"]dark['"]\s*:\s*['"]light['"]/);
  });

  it("wraps the script in try/catch for storage SecurityError", () => {
    expect(body).toMatch(/^try\s*\{/);
    expect(body).toMatch(/catch\s*\(/);
  });
});
