import { describe, expect, it } from "vitest";
import { mediaUsage } from "./media-usage";

const site = {
  pages: [
    { title: "Home", sections: [{ children: [{ content: { src: "/media/a.jpg" } }] }] },
    { title: "Projects", sections: [{ children: [{ content: { src: "/media/a.jpg?w=480" } }] }] },
  ],
  nav: {},
  globals: [{ node: { content: { logo: "/media/logo.svg" } } }],
  settings: {},
  theme: {},
  templates: [],
} as never;

describe("media usage", () => {
  it("lists the pages that use each file, and Site for shared parts", () => {
    const u = mediaUsage(site, ["/media/a.jpg", "/media/logo.svg", "/media/unused.png", "/media/a"]);
    expect(u.get("/media/a.jpg")).toEqual(["Home", "Projects"]);
    expect(u.get("/media/logo.svg")).toEqual(["Site"]);
    expect(u.get("/media/unused.png")).toEqual([]);
    expect(u.get("/media/a")).toEqual([]);
  });
});
