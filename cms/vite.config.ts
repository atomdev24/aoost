/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { buildSync } from "esbuild";

/** Bundles the editor's service worker (src/editor/pwa/sw.ts) to /admin/sw.js, stamped with this build. */
function serviceWorker(): Plugin {
  return {
    name: "aoost-service-worker",
    apply: "build",
    generateBundle() {
      const out = buildSync({
        entryPoints: ["src/editor/pwa/sw.ts"],
        bundle: true,
        write: false,
        format: "iife",
        target: "es2020",
        minify: true,
        define: { __BUILD__: JSON.stringify(Date.now().toString(36)) },
      });
      this.emitFile({ type: "asset", fileName: "sw.js", source: out.outputFiles[0]!.text });
    },
  };
}

// The admin (editor) SPA. The public site is pre-rendered by scripts/build-site.ts.
export default defineConfig({
  base: "/admin/",
  plugins: [react(), serviceWorker()],
  build: { outDir: "dist/admin", emptyOutDir: true },
  server: {
    proxy: {
      "/api": "http://localhost:8787",
      "/media": "http://localhost:8787",
      "/preview": "http://localhost:8787",
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
  },
});
