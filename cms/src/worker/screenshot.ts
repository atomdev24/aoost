import type { Page } from "../schema";
import { draftStub, type Env } from "./env";

export type Shot = { ok: true; png: string; via: string } | { ok: false; error: string };

/**
 * A PNG of a draft page for get_preview_screenshot (SPEC §8).
 * Cloudflare Browser Rendering is not used: its binding has to be enabled on
 * the account and counts against a small free allowance. Instead the open
 * editor captures its own preview and posts it back through the draft store.
 */
export async function screenshot(env: Env, page: Page, breakpoint: "mobile" | "desktop"): Promise<Shot> {
  const png = await draftStub(env).requestScreenshot(page.id, breakpoint);
  if (!png) return { ok: false, error: "No screenshot: the editor needs to be open in Alex's browser (it captures the preview). Ask Alex to open /admin, or check the result with get_page instead." };
  return { ok: true, png, via: "the open editor" };
}
