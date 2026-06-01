import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, type PluginOption } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

import { resolveBuildInfo } from "./buildInfo.ts";

// Resolved once at config load. Frozen at dev-server / build start by design —
// restart Vite to refresh these values after a new commit or version bump.
const buildInfo = resolveBuildInfo();

const bundleAnalyze = process.env.SYMBIOT_BUNDLE_ANALYZE === "1";

// Two build modes from one config:
//   default          → multi-chunk `dist/client/` served file-by-file by
//                       `serveStatic` (the source-run viewer + the Lighthouse
//                       perf harness). React.lazy boundaries (editor / diff) and
//                       Shiki's dynamic imports split into chunks the browser
//                       fetches AFTER the shell paints.
//   SYMBIOT_SINGLEFILE=1 → everything inlined into one `dist/embed/index.html`,
//                       gzipped and embedded into each agent binary as a
//                       self-contained blob served by `serveEmbeddedHtml` over
//                       localhost (where download is instant, so splitting buys
//                       nothing). See docs/architecture.md.
const singleFile = process.env.SYMBIOT_SINGLEFILE === "1";

// Editor-only runtime: Plate, Slate, the markdown stack, and their shared
// transitive deps (lodash, etc.). The shell (React, react-dom, @symbiot/ui,
// app code) never imports these synchronously — they are reachable only through
// the React.lazy `EditorMount` / `DiffMount` boundaries. Without an explicit
// chunk, Rollup hoists the code those two lazy chunks SHARE into the entry
// (their common ancestor), which would keep Plate on the first-paint path.
// Pinning it to one `editor` chunk keeps that ~500 KiB off the entry and lets
// the browser fetch it only when an editor actually mounts. Keep this list
// editor-exclusive: routing a shell dependency here would make the chunk eager.
const editorChunk =
  /[\\/]node_modules[\\/](platejs|@platejs[\\/][^\\/]+|slate|slate-react|slate-dom|slate-history|slate-hyperscript|is-hotkey|lodash|unified|unist-util-[^\\/]+|remark|remark-[^\\/]+|micromark[^\\/]*|mdast|mdast-util-[^\\/]+|marked|acorn|acorn-jsx|decode-named-character-reference|character-entities[^\\/]*|ccount|longest-streak|zwitch|trim-lines|markdown-table|html-void-elements|property-information|space-separated-tokens|comma-separated-tokens)[\\/]/;

const manualChunks = (id: string): string | undefined => {
  if (id.includes("/packages/symbiot-editor/")) return "editor";
  if (editorChunk.test(id)) return "editor";
  return undefined;
};

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";
  return {
    root: ".",
    plugins: [
      react(),
      tailwindcss(),
      ...(singleFile
        ? [
            viteSingleFile({
              inlinePattern: ["**/*.js", "**/*.css"],
              removeViteModuleLoader: true,
            }),
          ]
        : []),
      ...(bundleAnalyze
        ? [
            visualizer({
              filename: "bundle-stats/index.html",
              template: "treemap",
              gzipSize: true,
              brotliSize: true,
              sourcemap: false,
            }) as PluginOption,
          ]
        : []),
    ],
    define: {
      symbiotBuildInfo: JSON.stringify(buildInfo),
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": { target: "http://127.0.0.1:5174", changeOrigin: false },
      },
    },
    build: {
      outDir: singleFile ? "dist/embed" : "dist/client",
      emptyOutDir: true,
      target: "es2022",
      // Always emit external .js.map files so e2e coverage (Playwright + MCR)
      // can map JS back to TypeScript sources. The maps are separate files in
      // the assets dir and are NOT embedded into the hook binary (which only
      // ships index.html.gz), so binary size is unaffected.
      sourcemap: true,
      minify: !isDev,
      // Single-file inlines everything anyway, so manual chunking only applies
      // to the multi-chunk served build.
      ...(singleFile ? {} : { rollupOptions: { output: { manualChunks } } }),
    },
  };
});
