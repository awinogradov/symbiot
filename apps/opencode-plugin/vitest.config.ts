import { defineConfig } from "vitest/config";

// Vite needs to know `.gz` is an asset, not JS source — otherwise it tries
// to parse the gzipped viewer HTML that the plugin embeds via
// `with { type: "file" }` and dies during import analysis. Treating it as
// an asset returns the URL/path as a string, matching Bun's behavior.
export default defineConfig({
  assetsInclude: ["**/*.gz"],
  resolve: {
    conditions: ["source"],
  },
  test: {
    environment: "node",
  },
});
