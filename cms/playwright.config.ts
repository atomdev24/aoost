import { defineConfig } from "@playwright/test";

/** Browser tests run against the real Worker (wrangler dev) serving the built site and editor. */
export default defineConfig({
  testDir: "tests",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:8787", trace: "off" },
  webServer: {
    command: "npm run build && npx wrangler dev --port 8787",
    url: "http://localhost:8787/api/health",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
