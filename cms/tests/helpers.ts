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

/**
 * Start from a fresh draft with every page set live, so /preview/ shows the pages and the nav
 * as they will look once Alex publishes them. Only the homepage is published for now, and the
 * public site (and its nav) leaves draft pages out.
 */
export async function draftWithAllPagesLive(request: APIRequestContext, password: string) {
  await resetDraft(request, password);
  const site = await draftSite(request, password);
  // Variants stay drafts (they are never live), even when the content has some.
  const ops = site.pages
    .filter((p: { status: string; variantOf?: string }) => p.status !== "published" && !p.variantOf)
    .map((p: object) => ({ op: "putPage", page: { ...p, status: "published" } }));
  const res = await request.post("/api/editor/ops", { headers: bearer(password), data: { ops } });
  if (!res.ok()) throw new Error(`could not set the draft pages live: ${res.status()}`);
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

/**
 * The part of the board nothing floats over: below the top islands, above the
 * zoom pill, and left of the inspector when one is open.
 */
export async function clearArea(page: Page) {
  const board = (await page.locator(".bd").boundingBox())!;
  const panel = page.locator(".ed-inspector");
  const inspector = (await panel.count()) ? await panel.boundingBox() : null;
  return {
    top: board.y + 60,
    bottom: board.y + board.height - 90,
    left: board.x + 8,
    right: (inspector ? inspector.x : board.x + board.width) - 8,
  };
}

/**
 * The editor shows pages on a pan/zoom board, so a block can sit outside the
 * window. Pan the board (with the wheel, as a person would) until the block
 * is in view, and return its on-screen box.
 */
export async function onBoard(page: Page, target: import("@playwright/test").Locator) {
  const board = (await page.locator(".bd").boundingBox())!;
  for (let i = 0; i < 30; i++) {
    // The frame re-renders after an edit; give the block a moment to be back before giving up.
    let b = await target.boundingBox();
    for (let t = 0; !b && t < 30; t++) {
      await page.waitForTimeout(100);
      b = await target.boundingBox();
    }
    if (!b) throw new Error("block not on the board");
    const area = await clearArea(page);
    const h = Math.min(b.height, 160);
    const w = Math.min(b.width, 160);
    const midX = (area.left + area.right) / 2;
    const midY = (area.top + area.bottom) / 2;
    if (b.y >= area.top && b.y + h <= area.bottom && b.x >= area.left && b.x + w <= area.right) return b;
    const dy = b.y < area.top || b.y + h > area.bottom ? b.y + h / 2 - midY : 0;
    const dx = b.x < area.left || b.x + w > area.right ? b.x + w / 2 - midX : 0;
    await page.mouse.move(board.x + board.width / 2, board.y + board.height / 2);
    await page.mouse.wheel(dx, dy);
    await page.waitForTimeout(60);
  }
  throw new Error("could not bring the block into view");
}

/**
 * A known nav for nav tests, whatever Alex has published: About, Diary and Work (with Work's
 * sub-pages in a dropdown), every one shown in the nav. Call after draftWithAllPagesLive.
 */
export async function classicNav(request: APIRequestContext, password: string) {
  const site = await draftSite(request, password);
  const ids = ["about", "diary", "work"];
  const ops: object[] = site.pages
    .filter((p: { id: string; parentId?: string | null }) => ids.includes(p.id) || p.parentId === "work")
    .map((p: object) => ({ op: "putPage", page: { ...p, showInNav: true } }));
  const items = ids.map((pageId) => ({ id: `nav_${pageId}`, type: "page", target: { kind: "page", pageId }, showOn: "both", hover: "tint" }));
  ops.push({ op: "set", key: "nav", value: { ...site.nav, items } });
  const res = await request.post("/api/editor/ops", { headers: bearer(password), data: { ops } });
  if (!res.ok()) throw new Error(`could not set the test nav: ${res.status()}`);
}
