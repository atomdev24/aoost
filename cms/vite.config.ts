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
const LATER = /\/src\/editor\/(ui\/(UploadTray|PagesPanel|NewPageModal|GlobalPanel|OverlayPanel|PageSettings|HistoryPanel|MediaLibrary|NavPanel|ThemePanel|FontsPanel|LibraryPanel)|insert\/InsertPanel|workspace\/(PublishSheet|CompareView)|commands\/ProblemsDialog)\.tsx$|\/src\/editor\/ui\/upload-label\.ts$|\/src\/editor\/media-upload\.ts$|\/src\/editor\/workspace\/checks\.ts$|\/src\/editor\/comments\/(CommentLayer|CommentsPanel)\.tsx$|\/src\/editor\/comments\/store\.ts$|\/src\/editor\/workspace\/DemoBar\.tsx$|\/src\/editor\/canvas\/(AdjustImage\.tsx|section-resize\.ts)$|\/src\/editor\/workspace\/(VariantBand|BrowserZoomNotice)\.tsx$|\/src\/editor\/templates\/(TemplatesPanel|DesignsBoard)\.tsx$|\/src\/editor\/variants\/(PickSheet|VersionRows|VersionsButton)\.tsx$|\/src\/editor\/templates\/(templates|site-templates)\.ts$|\/src\/editor\/trim\.ts$|\/src\/editor\/QuickEdit\.tsx$|\/src\/editor\/workspace\/ClaudePill\.tsx$|\/src\/editor\/presence\/(store\.ts|PresenceLayer\.tsx|Activity\.tsx)$|\/src\/components\/aoost\/runtime\/(dots|lens)\.js$|\/src\/editor\/rich\/RichEditing\.tsx$|\/src\/editor\/insights\/InsightsModal\.tsx$|\/src\/editor\/ui\/liquid\.ts$|\/src\/editor\/rich\/FieldEditing\.tsx$/;

// The admin (editor) SPA. The public site is pre-rendered by scripts/build-site.ts.
export default defineConfig({
  base: "/admin/",
  // Scripts and styles find each other by relative address, so the same build also runs at /demo/
  // (the public demo editor, outside the paths Cloudflare Access guards).
  experimental: { renderBuiltUrl: (_file: string, { hostType }: { hostType: string }) => (hostType === "html" ? undefined : { relative: true }) },
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
