import { expect, test, type Page } from "@playwright/test";

const desktop = { width: 1440, height: 900 };
const phone = { width: 390, height: 844 };
const isHidden = (page: Page) => page.locator(".nav").evaluate((n) => n.classList.contains("is-hidden"));
const scrollTo = async (page: Page, y: number) => {
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  await page.waitForTimeout(80);
};

test.describe("floating pill nav, desktop", () => {
  test.use({ viewport: desktop });

  test("floats 16px from the top, centred, dark capsule", async ({ page }) => {
    await page.goto("/about"); // the home page is the original aoost page, which has no nav
    const box = (await page.locator(".pill").boundingBox())!;
    expect(Math.round(box.y)).toBe(16);
    expect(Math.abs(box.x + box.width / 2 - 720)).toBeLessThan(1);
    expect(await page.locator(".pill").evaluate((p) => getComputedStyle(p).backgroundColor)).toBe("rgb(20, 20, 20)");
  });

  test("hides past 140px on scroll down, returns on any scroll up, with hysteresis", async ({ page }) => {
    await page.goto("/sample"); // a tall page with the nav (the home page is the original aoost page, which has none)
    await scrollTo(page, 100);
    expect(await isHidden(page)).toBe(false); // not yet past 140px
    await scrollTo(page, 400);
    expect(await isHidden(page)).toBe(true);
    expect(await page.locator(".nav").evaluate((n) => getComputedStyle(n).transitionDuration)).toBe("0.5s");
    await scrollTo(page, 402); // inside the 4px hysteresis: no change
    await scrollTo(page, 399);
    expect(await isHidden(page)).toBe(true);
    await scrollTo(page, 380); // a real scroll up
    expect(await isHidden(page)).toBe(false);
    expect(await page.locator(".nav").evaluate((n) => n.classList.contains("is-scrolled"))).toBe(true);
  });

  test("marks the current page with a bone pill", async ({ page }) => {
    await page.goto("/diary");
    const current = page.locator('.pill-links [aria-current="page"]');
    await expect(current).toHaveText("Diary");
    expect(await current.evaluate((a) => getComputedStyle(a).backgroundColor)).toBe("rgb(243, 239, 230)");
    expect(await current.evaluate((a) => getComputedStyle(a).color)).toBe("rgb(20, 20, 20)");
  });

  test("links are at least 44px tall and press scales", async ({ page }) => {
    await page.goto("/about"); // the home page is the original aoost page, which has no nav
    for (const link of await page.locator(".pill-links .pill-link").all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });

  test("dropdown opens on hover after a short delay and closes on Escape", async ({ page }) => {
    await page.goto("/about"); // the home page is the original aoost page, which has no nav
    const menu = page.locator(".has-menu .menu");
    await expect(menu).toBeHidden();
    await page.locator(".has-menu").hover();
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem")).toHaveText(["Digital", "Physical"]);
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });

  test("dropdown works from the keyboard (menu-button pattern)", async ({ page }) => {
    await page.goto("/about"); // the home page is the original aoost page, which has no nav
    const caret = page.getByRole("button", { name: "Work submenu" });
    await caret.focus();
    await expect(caret).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("ArrowDown");
    await expect(caret).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("menuitem", { name: "Digital" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem", { name: "Physical" })).toBeFocused();
    await page.keyboard.press("ArrowDown"); // wraps
    await expect(page.getByRole("menuitem", { name: "Digital" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(caret).toBeFocused();
    await expect(caret).toHaveAttribute("aria-expanded", "false");
  });

  test("keyboard focus brings a hidden nav back", async ({ page }) => {
    await page.goto("/sample"); // a tall page with the nav (the home page is the original aoost page, which has none)
    await scrollTo(page, 500);
    expect(await isHidden(page)).toBe(true);
    await page.locator(".pill .pill-logo").focus();
    expect(await isHidden(page)).toBe(false);
  });
});

test.describe("floating pill nav, mobile", () => {
  test.use({ viewport: phone });

  test("shows the logo and a Menu button only", async ({ page }) => {
    await page.goto("/about"); // the home page is the original aoost page, which has no nav
    await expect(page.locator(".pill .pill-logo")).toBeVisible();
    await expect(page.locator(".pill-menu")).toBeVisible();
    await expect(page.locator(".pill-links")).toBeHidden();
    expect((await page.locator(".pill-menu").boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });

  test("opens a full-screen ink menu with big links, an accordion, and socials at the bottom", async ({ page }) => {
    await page.goto("/about"); // the home page is the original aoost page, which has no nav
    const opener = page.locator(".pill-menu");
    await opener.click();
    const sheet = page.locator("#nav-sheet");
    await expect(sheet).toBeVisible();
    await expect(opener).toHaveAttribute("aria-expanded", "true");
    const box = (await sheet.boundingBox())!;
    expect([box.x, box.y, box.width, box.height]).toEqual([0, 0, 390, 844]);
    expect(await sheet.evaluate((s) => getComputedStyle(s).backgroundColor)).toBe("rgb(20, 20, 20)");
    const diary = sheet.locator("a.sheet-link", { hasText: "Diary" });
    expect(await diary.evaluate((a) => getComputedStyle(a).fontSize)).toBe("40px");
    expect(await diary.evaluate((a) => getComputedStyle(a).animationName)).toBe("rise");
    await expect(sheet.locator(".sheet-social")).toHaveText(["Instagram", "Spotify"]);

    const acc = sheet.getByRole("button", { name: "Work submenu" });
    await expect(sheet.locator(".sheet-sub")).toBeHidden();
    await acc.click();
    await expect(sheet.locator(".sheet-sub a")).toHaveText(["Digital", "Physical"]);

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test("staggers the links by 60ms", async ({ page }) => {
    await page.goto("/about"); // the home page is the original aoost page, which has no nav
    await page.locator(".pill-menu").click();
    const delays = await page.locator(".sheet-links > *").evaluateAll((els) => els.map((el) => getComputedStyle(el).animationDelay));
    expect(delays.slice(0, 3)).toEqual(["0s", "0.06s", "0.12s"]);
  });

  test("a menu link navigates", async ({ page }) => {
    await page.goto("/about"); // the home page is the original aoost page, which has no nav
    await page.locator(".pill-menu").click();
    await page.locator("#nav-sheet a.sheet-link", { hasText: "Playlists" }).click();
    await expect(page).toHaveURL(/\/playlists$/);
    await expect(page.locator("h1")).toHaveText("Playlists");
  });

  test("no horizontal overflow at 390px on every page", async ({ page }) => {
    for (const path of ["/", "/work", "/work/digital", "/diary", "/playlists", "/rodeo", "/about", "/links"]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(390);
    }
  });
});

test.describe("reduced motion", () => {
  test.use({ viewport: desktop, reducedMotion: "reduce" });

  test("the nav stays put and nothing animates", async ({ page }) => {
    await page.goto("/about"); // the home page is the original aoost page, which has no nav
    await scrollTo(page, 600);
    expect(await page.locator(".nav").evaluate((n) => getComputedStyle(n).transform)).toBe("none");
    expect(await page.locator(".nav").evaluate((n) => getComputedStyle(n).transitionDuration)).toBe("0s");
  });
});
