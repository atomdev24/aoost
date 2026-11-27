// @vitest-environment happy-dom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { addExample } from "../../editor/collections/examples";
import { NodeContent } from "../../render/NodeView";
import { makeCtx } from "../../render/context";
import { Site, type Node } from "../../schema";
import { fixtureSite } from "../../seed/fixture";
import "../registry";
import { AeroEvents } from "./AeroEvents/AeroEvents";
import { AeroStories } from "./AeroStories/AeroStories";

const site = () => {
  let s = Site.parse(fixtureSite);
  s = addExample(s, "stories").site;
  return addExample(s, "events").site;
};
const render = (s: Site, type: string, content: Record<string, unknown>, editing = false) => {
  const node: Node = { id: "t", type, content, style: { base: {} } };
  return renderToStaticMarkup(<NodeContent node={node} ctx={makeCtx(s, s.pages[0]!, { editing, prefix: "/preview" })} />);
};

describe("lists filled from a collection", () => {
  it("Success stories: the live entries, linking to their pages, with play marks for video stories", () => {
    const s = site();
    const col = s.cms.find((c) => c.name === "Success stories")!;
    const html = render(s, "AeroStories", { ...AeroStories.defaults.content, collection: col.id, limit: 0 });
    expect(html.match(/class="abst-card"/g)).toHaveLength(4);
    expect(html).toContain('href="/preview/success-stories/ac-foods"');
    expect(html).not.toContain("Unifrutti Eastern Cape");
    expect(html.match(/abst-play/g)?.length).toBe(2);
  });
  it("Events: logos, dates and city, and the booking link", () => {
    const s = site();
    const col = s.cms.find((c) => c.name === "Events")!;
    const html = render(s, "AeroEvents", { ...AeroEvents.defaults.content, collection: col.id });
    expect(html).toContain("25 — 27 Nov 2026, Bolzano");
    expect(html).not.toContain("Fruit Attraction");
    expect(html).toContain('href="https://aerobotics.com/contact-us"');
  });
  it("falls back to the typed-in list when the collection is gone", () => {
    const html = render(site(), "AeroStories", { ...AeroStories.defaults.content, collection: "c_missing" });
    expect(html.match(/class="abst-card"/g)).toHaveLength(4);
    expect(html).toContain("Southern Cross Farms");
  });
});
