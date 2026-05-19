import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:5174", changeOrigin: false },
    },
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    target: "es2022",
    sourcemap: true,
    minify: false,
  },
});
