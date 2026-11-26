import { describe, expect, it } from "vitest";
import { expiredResponse, pageSlug } from "./expiry";

const env = (map: Record<string, string>) =>
  ({
    ASSETS: {
      fetch: async (r: Request) => (new URL(r.url).pathname === "/_expires.json" ? new Response(JSON.stringify(map)) : new Response("<h1>gone</h1>")),
    },
  }) as never;

describe("campaign expiry", () => {
  it("normalises addresses", () => {
    expect(pageSlug("/expo/")).toBe("/expo");
    expect(pageSlug("/expo.html")).toBe("/expo");
    expect(pageSlug("/")).toBe("/");
  });
  it("answers 410 after the unpublish day and leaves other pages alone", async () => {
    const e = env({ "/expo": "2026-12-01" });
    expect(await expiredResponse(new Request("https://x.com/expo"), e, "2026-12-01")).toBeNull();
    // The cache is per isolate; a fresh map is read the first time.
    expect((await expiredResponse(new Request("https://x.com/expo"), e, "2026-12-02"))?.status).toBe(410);
    expect(await expiredResponse(new Request("https://x.com/about"), e, "2026-12-02")).toBeNull();
    expect(await expiredResponse(new Request("https://x.com/expo/pic.jpg"), e, "2026-12-02")).toBeNull();
  });
});
