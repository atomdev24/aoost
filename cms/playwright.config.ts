import { defineConfig } from "@playwright/test";

/**
 * Browser tests run against the real Worker (wrangler dev) serving the built site and editor.
 * The tests sign in with the editor password, so the local Worker runs in password mode
 * (production stays on Cloudflare Access). E2E_PORT picks another port when 8787 is busy.
 */
const port = Number(process.env.E2E_PORT ?? 8787);

export default defineConfig({
  testDir: "tests",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  // The editor's service worker stays out of the way (it would hide requests from page.route); the PWA spec turns it on.
  use: { baseURL: `http://localhost:${port}`, trace: "off", serviceWorkers: "block" },
  webServer: {
    command: `npm run build && npx wrangler dev --port ${port} --var AUTH_MODE:password`,
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
