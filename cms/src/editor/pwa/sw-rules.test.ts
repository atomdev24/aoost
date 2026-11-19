import { describe, expect, it } from "vitest";
import { cacheable, cacheRule } from "./sw-rules";

const o = "https://aoost.example";
const rule = (path: string, method = "GET", navigate = false) => cacheRule(o + path, method, o, navigate);

describe("service worker cache rules", () => {
  it("caches the editor shell and its build files", () => {
    expect(rule("/admin/", "GET", true)).toBe("shell");
    expect(rule("/admin/?page=about", "GET", true)).toBe("shell");
    expect(rule("/admin/assets/index-abc123.js")).toBe("asset");
    expect(rule("/admin/manifest.webmanifest")).toBe("static");
    expect(rule("/admin/app-icon-180.png")).toBe("static");
  });
  it("never caches the API, draft, publish, connector, previews or media", () => {
    for (const p of ["/api/editor/site", "/api/editor/state", "/api/editor/ops", "/api/editor/publish", "/api/editor/publish/status", "/mcp", "/preview/about", "/media/x.jpg", "/api/login"]) {
      expect(rule(p)).toBeNull();
      expect(rule(p, "GET", true)).toBeNull();
    }
    expect(rule("/api/editor/publish", "POST")).toBeNull();
  });
  it("leaves sign-in, the worker itself, other methods and other sites alone", () => {
    expect(rule("/admin/login", "GET", true)).toBeNull();
    expect(rule("/admin/sw.js")).toBeNull();
    expect(rule("/admin/", "POST", true)).toBeNull();
    expect(cacheRule("https://fonts.googleapis.com/css2", "GET", o, false)).toBeNull();
  });
  it("keeps only plain successful answers", () => {
    expect(cacheable({ ok: true, type: "basic", redirected: false })).toBe(true);
    expect(cacheable({ ok: true, type: "basic", redirected: true })).toBe(false);
    expect(cacheable({ ok: false, type: "basic", redirected: false })).toBe(false);
    expect(cacheable({ ok: true, type: "opaque", redirected: false })).toBe(false);
  });
});
