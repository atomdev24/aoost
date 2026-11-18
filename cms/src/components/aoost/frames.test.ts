import { describe, expect, it } from "vitest";
import { createNode, createSection } from "../../model/page-ops";
import { pageCss } from "../../render/document";
import { DEFAULT_FRAME_FIT, Site, type Node } from "../../schema";
import { fixtureSite } from "../../seed/fixture";
import { getComponent } from "../registry";
import { renderNode } from "../test-utils";
import { itemAt, slotBgDecls, slotImgDecls, withItemFrame } from "./frames";

const site = Site.parse(fixtureSite);
const fill = (focalX: number, focalY: number) => ({ ...DEFAULT_FRAME_FIT, focalX, focalY });

function cssFor(nodes: Node[]) {
  const page = { ...site.pages[0]!, sections: [createSection("flow", { id: "s1", children: nodes })], overlays: [] };
  const css = pageCss(site, page);
  const at = css.lastIndexOf("@media (min-width:");
  return { css, mobile: css.slice(0, at), desktop: css.slice(at) };
}

const hero = (reel: unknown[]) => createNode("AoostHero", { id: "hero1", content: { reel } });

describe("aoost image framing", () => {
  it("numbers the pictures the way the page shows them", () => {
    const content = { ...getComponent("AoostHero")!.defaults.content, reel: [{ src: "a.jpg" }, { src: "" }, { src: "b.jpg", frame: { base: fill(20, 80) } }] };
    const slots = getComponent("AoostHero")!.frames!(content);
    expect(slots.map((s) => [s.path, s.selector, s.label])).toEqual([
      [["reel", 0], ".hr-track>.hr-slide:nth-child(1)>img", "Artwork 1"],
      [["reel", 2], ".hr-track>.hr-slide:nth-child(2)>img", "Artwork 2"],
    ]);
    expect(slots[1]!.frame).toEqual({ base: fill(20, 80) });
  });

  it("puts mobile values in the base rules and desktop values in the desktop media query", () => {
    const { mobile, desktop } = cssFor([hero([{ src: "a.jpg" }, { src: "b.jpg", frame: { base: fill(20, 80), desktop: { focalX: 50, focalY: 50 } } }])]);
    expect(mobile).toContain(".n-hero1 .hr-track>.hr-slide:nth-child(2)>img{object-fit:cover;object-position:20% 80%;transform:none}");
    expect(desktop).toContain(".n-hero1 .hr-track>.hr-slide:nth-child(2)>img{object-position:50% 50%}");
    expect(desktop).not.toContain("20% 80%");
    expect(mobile + desktop).not.toContain("nth-child(1)>img");
  });

  it("a mobile override shows only below the desktop breakpoint", () => {
    const { mobile, desktop } = cssFor([hero([{ src: "a.jpg", frame: { base: fill(10, 10), desktop: { focalX: 50, focalY: 50 } } }])]);
    expect(mobile).toContain("object-position:10% 10%");
    expect(desktop).not.toContain("10% 10%");
    expect(desktop).toContain("object-position:50% 50%");
  });

  it("free mode scales and pans like the media blocks, clipped to the picture's own box", () => {
    expect(slotImgDecls({ ...DEFAULT_FRAME_FIT, fit: "free", zoom: 2 })).toEqual({
      "object-fit": "cover",
      "object-position": "50% 50%",
      "transform-origin": "50% 50%",
      transform: "translate(0%, 0%) scale(2)",
      "clip-path": "inset(25% 25% 25% 25%)",
    });
    expect(slotImgDecls({ ...DEFAULT_FRAME_FIT, fit: "free", panX: 10 })["clip-path"]).toBe("inset(0% 10% 0% 0%)");
    expect(slotImgDecls(fill(30, 40))).toEqual({ "object-fit": "cover", "object-position": "30% 40%", transform: "none" });
  });

  it("journal covers are backgrounds: the frame sets their position", () => {
    expect(slotBgDecls(fill(10, 90))).toEqual({ "background-position": "10% 90%", "background-size": "cover" });
    expect(slotBgDecls({ ...fill(0, 0), fit: "fit" })["background-size"]).toBe("contain");
    const d = getComponent("AoostJournals")!.defaults.content as { journals: Record<string, unknown>[] };
    const journals = d.journals.map((j, i) => (i === 2 ? { ...j, frame: { base: fill(0, 100) } } : j));
    const { mobile } = cssFor([createNode("AoostJournals", { id: "j1", content: { journals } })]);
    expect(mobile).toContain(".n-j1 .jr-shelf>.jr:nth-child(3)>.jr-cv{background-position:0% 100%;background-size:cover}");
  });

  it("covers playlists, project pieces and the sticky note", () => {
    const pl = getComponent("AoostPlaylistBand")!.frames!({ ...(getComponent("AoostPlaylistBand")!.defaults.content as object), playlists: [{ title: "A", spotify: "x", hidden: true, cover: "a.jpg" }, { title: "B", spotify: "y", cover: "b.jpg" }] } as never);
    expect(pl.map((s) => s.selector)).toEqual([".cv-frames>.cv-frame:nth-child(1)>.disc>img"]);
    const pj = getComponent("AoostProjects")!.frames!({ ...(getComponent("AoostProjects")!.defaults.content as object), projects: [{ image: "a.jpg" }, { image: "b.jpg", hidden: true }, { image: "c.jpg" }], note: { show: true, image: "n.jpg" } } as never);
    expect(pj.map((s) => s.selector)).toEqual([".table>.piece:nth-child(1)>img", ".table>.piece:nth-child(2)>img", '.sticky[data-note="0"]>img']);
    expect(pj[1]!.path).toEqual(["projects", 2]);
  });

  it("content without frames renders exactly as before", () => {
    const types = ["AoostHero", "AoostProjects", "AoostJournals", "AoostPlaylistBand"];
    const nodes = types.map((t, i) => createNode(t, { id: `b${i}` }));
    const { css } = cssFor(nodes);
    // The same page with the blocks' framing switched off entirely.
    const saved = types.map((t) => getComponent(t)!.frames);
    types.forEach((t) => delete getComponent(t)!.frames);
    try {
      expect(cssFor(nodes).css).toBe(css);
    } finally {
      types.forEach((t, i) => (getComponent(t)!.frames = saved[i]));
    }
    for (const t of types) {
      const content = getComponent(t)!.defaults.content as Record<string, unknown>;
      expect(renderNode(t, content)).not.toContain("&quot;frame&quot;");
      expect(renderNode(t, content)).not.toContain("\"frame\":");
    }
  });

  it("edits one item's frame without touching the rest", () => {
    const content = { reel: [{ src: "a" }, { src: "b", frame: { base: fill(1, 1) } }], label: "x" };
    const next = withItemFrame(content, ["reel", 0], { base: fill(5, 5) });
    expect(itemAt(next, ["reel", 0])).toEqual({ src: "a", frame: { base: fill(5, 5) } });
    expect(next.reel[1]).toBe(content.reel[1]);
    expect(withItemFrame(next, ["reel", 1], undefined).reel[1]).toEqual({ src: "b" });
    expect(itemAt({ note: { show: true } }, ["note"])).toEqual({ show: true });
  });
});
