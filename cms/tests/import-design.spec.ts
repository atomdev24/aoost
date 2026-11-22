import { expect, test } from "@playwright/test";
import { bearer, draftSite, editorPassword, mcpCall, resetDraft } from "./helpers";

/** Claude brings a design in through the connector in one call (import_design). */
const password = editorPassword();

test.describe("import a design", () => {
  test.skip(!password, "needs EDITOR_PASSWORD in .dev.vars");
  test.afterAll(async ({ request }) => {
    await resetDraft(request, password!);
  });

  test("a frame's layers become a free-layout section that renders on the page", async ({ request, page }) => {
    await resetDraft(request, password!);
    const res = await mcpCall(request, password!, "import_design", {
      page: "sample",
      name: "Field notes",
      index: 0,
      design: {
        frame: { width: 1200, height: 600 },
        layers: [
          { kind: "box", name: "Band", x: 0, y: 0, w: 1200, h: 600, fill: "#141414" },
          { kind: "text", name: "Title", x: 100, y: 120, w: 600, h: 80, text: "Field notes from the road", size: 64, color: "#F3F0E6" },
          { kind: "button", name: "CTA", x: 100, y: 320, w: 160, h: 48, text: "See the work", href: "/work" },
        ],
      },
    });
    expect(res.isError).toBeFalsy();
    const sectionId = /"sectionId":\s*"([^"]+)"/.exec(res.content[0]!.text!)![1];
    const sample = (await draftSite(request, password!)).pages.find((p: { id: string }) => p.id === "sample");
    expect(sample.sections[0].id).toBe(sectionId);
    expect(sample.sections[0].children.map((n: { name: string }) => n.name)).toEqual(["Band", "Title", "CTA"]);
    // it renders in the draft preview, at desktop and on a phone, without spilling sideways
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.context().setExtraHTTPHeaders(bearer(password!));
      await page.goto("/preview/sample");
      await expect(page.getByText("Field notes from the road")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    }
  });
});
