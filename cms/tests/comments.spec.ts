import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bearer, draftSite, editorPassword, mcpCall, onBoard, resetDraft, signIn } from "./helpers";

/**
 * Comments on the canvas (site and CMS review, 22 Nov 2026): press C, click a block, write; the pin
 * stays on that block; edits to the block show up in the open thread; reply, resolve, find it in
 * the Comments panel.
 */
const password = editorPassword();
const shots = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/screenshots/comments");
const canvas = (page: Page) => page.frameLocator("#preview-frame");
type Thread = { id: string; nodeId: string; status: string; label: string; messages: { text: string; by: { name: string } }[]; events: { text: string; by: string }[] };
const threads = async (request: APIRequestContext): Promise<Thread[]> => (await (await request.get("/api/editor/comments", { headers: bearer(password!) })).json()).threads;
const removeAll = async (request: APIRequestContext) => {
  for (const t of await threads(request)) await request.post("/api/editor/comments", { headers: bearer(password!), data: { op: "delete", id: t.id } });
};

test.describe("comments", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page, request }) => {
    await resetDraft(request, password!);
    await removeAll(request);
    await signIn(page, password!);
    await page.goto("/admin/?page=sample");
    await page.evaluate(() => localStorage.setItem("ed-comment-author", JSON.stringify({ name: "Tester", color: "#3B82F6" })));
    await page.reload();
    await expect(canvas(page).locator(".n-sample-title")).toBeVisible();
    await page.keyboard.press("Escape");
  });
  test.afterAll(async ({ request }) => {
    await removeAll(request);
    await resetDraft(request, password!);
  });

  test("press C, click a block, comment; edits show in the thread; reply and resolve", async ({ page, request }) => {
    const title = canvas(page).locator(".n-sample-title");
    await page.keyboard.press("c");
    await expect(page.locator('.ed-tool[data-tool="comment"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".ed-cmt-hint")).toBeVisible();

    const box = await onBoard(page, title);
    await page.mouse.click(box.x + 30, box.y + 10);
    const draft = page.getByRole("dialog", { name: "New comment" });
    await expect(draft).toBeVisible();
    // clicking while commenting didn't select the block
    await expect(page.locator(".ed-inspector textarea:visible")).toHaveCount(0);
    await draft.getByRole("textbox").fill("Bigger, please? @Maya");
    await draft.getByRole("textbox").press("Enter");

    const thread = page.getByRole("dialog", { name: /Comment thread on/ });
    await expect(thread).toContainText("Bigger, please?");
    await expect(thread.locator(".ed-cmt-mention")).toHaveText("@Maya");
    await expect(page.locator(".ed-cmt-pin")).toHaveCount(1);
    await expect(page.locator('.ed-tool[data-tool="comment"]')).toHaveAttribute("aria-pressed", "false");
    const site = await draftSite(request, password!);
    const headlineId = site.pages.find((p: { id: string }) => p.id === "sample").sections[0].children[1].id;
    await expect.poll(async () => (await threads(request))[0]?.nodeId).toBe(headlineId);

    // edit the block: the open thread shows it
    await page.keyboard.press("Escape");
    const b2 = await onBoard(page, title);
    await page.mouse.click(b2.x + 20, b2.y + 20);
    await page.locator("textarea:visible").first().fill("Bigger and bolder.");
    await expect.poll(async () => (await threads(request))[0]?.events.length ?? 0).toBeGreaterThan(0);
    expect((await threads(request))[0]!.events[0]!.by).toBe("Tester");
    await page.locator(".ed-cmt-pin").first().click();
    await expect(thread.locator(".ed-cmt-event").first()).toContainText("Tester");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${shots}/thread-1440.png` });

    // reply, then resolve: the pin goes; the panel lists it under Resolved
    await thread.getByRole("textbox").fill("Done, take a look.");
    await thread.getByRole("textbox").press("Enter");
    await expect.poll(async () => (await threads(request))[0]?.messages.length).toBe(2);
    await thread.getByRole("button", { name: /Resolve/ }).click();
    await expect(page.locator(".ed-cmt-pin")).toHaveCount(0);
    await expect.poll(async () => (await threads(request))[0]?.status).toBe("resolved");
    await page.locator('.ed-rail-btn[aria-label="Comments"]').click();
    const panel = page.locator(".ed-cmts");
    await expect(panel.getByRole("tab", { name: /Resolved · 1/ })).toBeVisible();
    await panel.getByRole("tab", { name: /Resolved/ }).click();
    await expect(panel.locator(".ed-cmts-item")).toContainText("Done, take a look.");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${shots}/panel-1440.png` });
  });

  test("a comment made on Mobile stays on Mobile, and the panel takes you there", async ({ page, request }) => {
    await page.locator(".ed-island-bps").getByRole("button", { name: "Mobile" }).click();
    await page.keyboard.press("c");
    const title = canvas(page).locator(".n-sample-title");
    const box = await onBoard(page, title);
    await page.mouse.click(box.x + 10, box.y + 10);
    const draft = page.getByRole("dialog", { name: "New comment" });
    await draft.getByRole("textbox").fill("Too tight on phones");
    await draft.getByRole("textbox").press("Enter");
    await expect.poll(async () => (await threads(request))[0]?.label ?? "").not.toBe("");
    await page.keyboard.press("Escape");
    await expect(page.locator(".ed-cmt-pin")).toHaveCount(1);
    await page.locator(".ed-island-bps").getByRole("button", { name: "Desktop" }).click();
    await expect(page.locator(".ed-cmt-pin")).toHaveCount(0);
    await page.locator('.ed-rail-btn[aria-label="Comments"]').click();
    await page.locator(".ed-cmts-item").first().click();
    await expect(page.locator(".ed-island-bps").getByRole("button", { name: "Mobile" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("dialog", { name: /Comment thread on/ })).toContainText("Too tight on phones");
  });

  test("Claude reads the comments and replies through the connector", async ({ page, request }) => {
    await request.post("/api/editor/comments", { headers: bearer(password!), data: { op: "create", id: "t-claude01", pageId: "sample", nodeId: "x-node", bp: "desktop", fx: 0.5, fy: 0.5, label: "Text", by: { name: "Maya", color: "#E14B8A" }, text: "Tighten the intro" } });
    const read = await mcpCall(request, password!, "get_comments", {});
    expect(JSON.stringify(read)).toContain("Tighten the intro");
    expect(JSON.stringify(read)).toContain("t-claude01");
    await mcpCall(request, password!, "reply_to_comment", { id: "t-claude01", text: "Shortened it to one line.", resolve: true });
    const t = (await threads(request)).find((x) => x.id === "t-claude01")!;
    expect(t.status).toBe("resolved");
    expect(t.messages.at(-1)).toMatchObject({ text: "Shortened it to one line.", by: { name: "Claude" } });
    await page.locator('.ed-rail-btn[aria-label="Comments"]').click();
    await page.locator(".ed-cmts").getByRole("tab", { name: /Resolved/ }).click();
    await expect(page.locator(".ed-cmts-item")).toContainText("Claude: Shortened it to one line.");
  });
});
