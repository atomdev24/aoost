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

/** The modules of the parts that load after the board (src/editor/parts.ts). */
const LATER = /\/src\/editor\/(ui\/(PagesPanel|NewPageModal|PageSettings|HistoryPanel|MediaLibrary|NavPanel|ThemePanel|FontsPanel|LibraryPanel)|insert\/InsertPanel|workspace\/(PublishSheet|CompareView)|commands\/ProblemsDialog)\.tsx$|\/src\/components\/aoost\/runtime\/(dots|lens)\.js$/;

// The admin (editor) SPA. The public site is pre-rendered by scripts/build-site.ts.
export default defineConfig({
  base: "/admin/",
  plugins: [react(), serviceWorker()],
  build: {
    outDir: "dist/admin",
    emptyOutDir: true,
    sourcemap: process.env.SOURCEMAP === "1",
    // The editor's own start-up code goes in one file ("editor"); the parts in src/editor/parts.ts
    // stay in their own files and load after the board. Without this group the code shared by both
    // was cut into ~20 small files that all loaded at the start anyway. (A single group for all of
    // node_modules would also pull in Puck's own load-later pieces, so libraries split as before.)
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "editor", test: (id: string) => /\/src\//.test(id) && !LATER.test(id), priority: 1 },
          ],
        },
      },
    },
  },
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
