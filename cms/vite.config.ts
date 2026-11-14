/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The admin (editor) SPA. The public site is pre-rendered by scripts/build-site.ts.
export default defineConfig({
  base: "/admin/",
  plugins: [react()],
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
