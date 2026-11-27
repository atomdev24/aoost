import { expect, test } from "@playwright/test";

/**
 * The demo editor (/demo/): open without signing in, shows the wireframe sample site, and can't
 * reach the real draft, GitHub, uploads, or code that runs on the page. Publish only pretends.
 */
const canvas = (page: import("@playwright/test").Page) => page.frameLocator("#preview-frame");

test.describe("demo editor", () => {
  test.beforeEach(async ({ request }) => {
    expect((await request.post("/demo/api/editor/demo/reset")).ok()).toBe(true);
  });

  test("opens without a sign-in, on the sample site, with the demo notice", async ({ page }) => {
    await page.goto("/demo/");
    await expect(canvas(page).getByText("A headline goes here.")).toBeVisible({ timeout: 20_000 });
    // The demo says so in a thin strip; its Details opens the full card (Nov 2026: no card on arrival).
    await expect(page.getByRole("dialog", { name: "About this demo" })).toHaveCount(0);
    await page.getByRole("button", { name: "Details" }).click();
    await expect(page.getByRole("dialog", { name: "About this demo" })).toBeVisible();
    await page.getByRole("button", { name: "Got it" }).click();
    await expect(page.getByRole("dialog", { name: "About this demo" })).toHaveCount(0);
    // nothing of the real site in the canvas
    await expect(canvas(page).locator("img[src*='/art/']")).toHaveCount(0);
  });

  test("keeps apart from the real draft, refuses uploads and on-page code, and only pretends to publish", async ({ request }) => {
    expect((await request.get("/api/editor/site")).status()).toBe(401);
    const { site } = await (await request.get("/demo/api/editor/site")).json();
    expect(site.settings.title).toBe("Studio (demo)");

    // an edit lands in the demo draft only
    const home = site.pages.find((p: { id: string }) => p.id === "home");
    const edited = structuredClone(home);
    edited.sections[0].children[1].content.text = "Edited in the demo";
    expect((await request.post("/demo/api/editor/ops", { data: { ops: [{ op: "putPage", page: edited }] } })).ok()).toBe(true);
    expect(await (await request.get("/demo/preview/")).text()).toContain("Edited in the demo");

    // code that would run on the page is refused
    const withCode = structuredClone(home);
    withCode.sections[0].children.push({ id: "demo-code", type: "Code", content: { mode: "inline", html: "<script>1</script>", css: "", js: "", height: 120 }, style: { base: {} } });
    const refused = await request.post("/demo/api/editor/ops", { data: { ops: [{ op: "putPage", page: withCode }] } });
    expect(refused.status()).toBe(422);
    expect(JSON.stringify(await refused.json())).toContain("off in the demo");

    // uploads are off; the library lists the placeholders
    expect((await request.post("/demo/api/editor/media", { multipart: { file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("x") } } })).status()).toBe(403);
    const media = await (await request.get("/demo/api/editor/media")).json();
    expect(media.items.length).toBeGreaterThan(5); // placeholders plus the Aerobotics pictures

    // publish pretends: the demo's "live" catches up; nothing else happens
    const pub = await (await request.post("/demo/api/editor/publish", { data: {} })).json();
    expect(pub.demo).toBe(true);
    expect((await (await request.get("/demo/api/editor/state")).json()).dirty).toBe(false);
    expect(await (await request.get("/demo/preview/_live/")).text()).toContain("Edited in the demo");

    // reset puts it back
    await request.post("/demo/api/editor/demo/reset");
    expect(await (await request.get("/demo/preview/")).text()).not.toContain("Edited in the demo");
    // the real public site never had it
    expect(await (await request.get("/")).text()).not.toContain("Edited in the demo");
  });

  test("a demo staging link opens under /demo with its own tag", async ({ request }) => {
    const { staging } = await (await request.post("/demo/api/editor/staging", { data: { label: "Demo try" } })).json();
    expect(staging.path).toMatch(/^\/demo\/staging\//);
    const html = await (await request.get(staging.path)).text();
    expect(html).toContain("A headline goes here.");
    expect(html).toContain("Demo · staging preview");
  });
});
