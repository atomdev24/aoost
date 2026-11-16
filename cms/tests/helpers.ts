import { type APIRequestContext, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** The editor password from .dev.vars (never printed). Editor tests skip themselves without it. */
export function editorPassword(): string | null {
  for (const file of [resolve(__dirname, "../.dev.vars"), resolve(__dirname, "../../.dev.vars")]) {
    if (!existsSync(file)) continue;
    const m = /^EDITOR_PASSWORD=(.*)$/m.exec(readFileSync(file, "utf8"));
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return process.env.EDITOR_PASSWORD ?? null;
}

export const bearer = (password: string) => ({ Authorization: `Bearer ${password}`, "Content-Type": "application/json" });

export async function resetDraft(request: APIRequestContext, password: string) {
  await request.post("/api/editor/reset", { headers: bearer(password) });
}

export async function draftSite(request: APIRequestContext, password: string) {
  return (await (await request.get("/api/editor/site", { headers: bearer(password) })).json()).site;
}

/** Call one MCP tool over streamable HTTP and return its result. */
export async function mcpCall(request: APIRequestContext, password: string, name: string, args: Record<string, unknown> = {}) {
  const res = await request.post("/mcp", { headers: { ...bearer(password), Accept: "application/json, text/event-stream" }, data: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } } });
  return (await res.json()).result as { content: { type: string; text?: string; data?: string; mimeType?: string }[]; isError?: boolean };
}

export async function signIn(page: Page, password: string) {
  const res = await page.context().request.post("/api/login", { data: { password } });
  if (!res.ok()) throw new Error(`login failed: ${res.status()}`);
}

/**
 * A whole-page screenshot that includes everything a visitor would see after
 * scrolling: lazy images and frames, enter animations, play-in-view video.
 * Embedded frames only paint inside the viewport, so the viewport is made as tall as the page.
 */
export async function fullPageShot(page: Page, path: string) {
  const size = page.viewportSize()!;
  await page.evaluate(async () => {
    document.querySelectorAll<HTMLImageElement | HTMLIFrameElement>("[loading=lazy]").forEach((el) => (el.loading = "eager"));
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  const height = Math.min(16000, await page.evaluate(() => document.documentElement.scrollHeight));
  await page.setViewportSize({ width: size.width, height });
  // Third-party embeds can keep connections open for ever, so don't wait on them for long.
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path });
  await page.setViewportSize(size);
}
