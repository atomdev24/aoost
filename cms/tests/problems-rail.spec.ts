import { expect, test } from "@playwright/test";
import { bearer, editorPassword, signIn } from "./helpers";

/**
 * The problem log (the editor notices what goes wrong; Report a problem adds a note) and the
 * movable panel bar (drag the rail by its grip; it stays where it's put; double-click puts it back).
 */
const password = editorPassword();

test.describe("problem log", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1512, height: 900 } });

  test("Report a problem saves a note with where the editor was; the log reads back in the editor, as text and through Claude", async ({ page, request }) => {
    await request.delete("/api/editor/problems", { headers: bearer(password!) });
    await signIn(page, password!);
    await page.goto("/admin/?page=home");
    await page.waitForSelector(".bd-frame-active iframe");

    // A report from the palette.
    await page.keyboard.press("Meta+k");
    await page.keyboard.type("report a problem", { delay: 20 });
    await page.getByRole("dialog").getByText("Report a problem", { exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Report a problem" })).toBeVisible();
    await page.getByLabel("What happened?").fill("Zooming out, the inspector flickered");
    await page.getByRole("button", { name: "Save report" }).click();
    await expect(page.getByText("Saved to the problem log")).toBeVisible();

    const log = async () => (await (await request.get("/api/editor/problems", { headers: bearer(password!) })).json()).items as { kind: string; message: string; context?: Record<string, unknown>; who: string }[];
    await expect.poll(async () => (await log()).some((p) => p.kind === "report")).toBe(true);
    const report = (await log()).find((p) => p.kind === "report")!;
    expect(report.message).toBe("Zooming out, the inspector flickered");
    expect(report.context).toMatchObject({ page: "home", size: "desktop" });
    expect(typeof report.context!.zoom).toBe("number");
    expect(String(report.context!.browser)).toMatch(/Chrome|Safari|Firefox/);

    // The log in the editor, newest first.
    await page.getByRole("button", { name: "Open the problem log" }).click();
    const dialog = page.getByRole("dialog", { name: "Problem log" });
    await expect(dialog.locator(".ed-problems-list li").first()).toContainText("Zooming out, the inspector flickered");

    // Readable as text, and through the Claude connector.
    const text = await (await request.get("/api/editor/problems?format=text", { headers: bearer(password!) })).text();
    expect(text).toContain("report");
    expect(text).toContain("Zooming out, the inspector flickered");
    const mcp = await request.post("/mcp", { headers: { ...bearer(password!), Accept: "application/json, text/event-stream" }, data: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_problem_log", arguments: { limit: 10 } } } });
    expect((await mcp.json()).result.content[0].text).toContain("Zooming out, the inspector flickered");

    // Junk is refused; the store keeps only valid entries.
    const bad = await request.post("/api/editor/problems", { headers: bearer(password!), data: { items: [{ kind: "nope", message: "x", t: 1 }, { kind: "error", message: "", t: 1 }] } });
    expect((await bad.json()).kept).toBe(0);
    await request.delete("/api/editor/problems", { headers: bearer(password!) });
  });
});

test.describe("movable panel bar", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.use({ viewport: { width: 1512, height: 900 } });

  test("drag the rail by its grip; its panel follows and opens on the side with room; it's remembered; double-click puts it back", async ({ page, request }) => {
    void request;
    await signIn(page, password!);
    await page.goto("/admin/?page=home");
    await page.evaluate(() => localStorage.removeItem("aoost.rail.pos"));
    await page.reload();
    await page.waitForSelector(".bd-frame-active iframe");
    const rail = page.locator(".ed-rail");
    const grip = page.locator(".ed-rail-grip");
    const before = (await rail.boundingBox())!;
    expect(Math.round(before.x)).toBe(10);

    // Drag to the middle of the canvas.
    const g = (await grip.boundingBox())!;
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await page.mouse.down();
    await page.mouse.move(g.x + 600, g.y + 150, { steps: 8 });
    await page.mouse.up();
    const moved = (await rail.boundingBox())!;
    expect(Math.round(moved.x)).toBe(Math.round(before.x + 600 - g.width / 2));
    expect(moved.y).toBeGreaterThan(before.y + 100);

    // The Layers panel opens beside it.
    if (!(await page.locator(".ed-flyout").isVisible())) await page.getByRole("button", { name: "Layers", exact: true }).click();
    const fly = (await page.locator(".ed-flyout").boundingBox())!;
    expect(fly.x).toBeGreaterThan(moved.x + moved.width);
    expect(Math.abs(fly.y - moved.y)).toBeLessThan(2);

    // Remembered after a reload.
    await page.reload();
    await page.waitForSelector(".bd-frame-active iframe");
    expect(Math.round((await rail.boundingBox())!.x)).toBe(Math.round(moved.x));

    // Near the right edge it snaps there and the panel opens to its left.
    const g2 = (await grip.boundingBox())!;
    await page.mouse.move(g2.x + g2.width / 2, g2.y + g2.height / 2);
    await page.mouse.down();
    await page.mouse.move(1512 - 30, g2.y + 10, { steps: 8 });
    await page.mouse.up();
    const right = (await rail.boundingBox())!;
    expect(Math.round(right.x + right.width)).toBe(1512 - 10);
    if (!(await page.locator(".ed-flyout").isVisible())) await page.getByRole("button", { name: "Layers", exact: true }).click();
    expect((await page.locator(".ed-flyout").boundingBox())!.x + 260).toBeLessThanOrEqual(right.x);

    // Double-click the grip: back home.
    await grip.dblclick();
    expect(Math.round((await rail.boundingBox())!.x)).toBe(10);
    expect(await page.evaluate(() => localStorage.getItem("aoost.rail.pos"))).toBeNull();
  });
});
