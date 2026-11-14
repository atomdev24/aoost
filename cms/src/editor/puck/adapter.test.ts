import { describe, expect, it } from "vitest";
import { Site } from "../../schema";
import { seedSite } from "../../seed/site";
import { itemToNode, nodeToItem, pageToPuck, puckToPage } from "./adapter";

const site = Site.parse(seedSite);

describe("Puck adapter", () => {
  it("round-trips every seed page", () => {
    for (const page of site.pages) expect(puckToPage(pageToPuck(page), page)).toEqual(page);
  });
  it("maps section kinds to Puck components", () => {
    expect(pageToPuck(site.pages[0]!).content.map((i) => i.type)).toEqual(["FlowSection", "CanvasSection", "GridSection", "FlowSection"]);
  });
  it("flattens node content into props and back", () => {
    const node = site.pages[0]!.sections[0]!.children[1]!;
    const item = nodeToItem(node);
    expect(item.props.text).toBe("A visual diary, for people in the know.");
    expect(item.props.style).toEqual(node.style);
    expect(itemToNode(item)).toEqual(node);
  });
  it("drops Puck's own props and empty metadata", () => {
    const node = itemToNode({ type: "Text", props: { id: "a", text: "x", styleId: "body", tag: "p", name: "", puck: {}, editMode: true, style: { base: {} } } });
    expect(node).toEqual({ id: "a", type: "Text", content: { text: "x", styleId: "body", tag: "p" }, style: { base: {} } });
  });
  it("ignores items dropped outside a section", () => {
    const page = site.pages[0]!;
    const data = pageToPuck(page);
    data.content.push({ type: "Text", props: { id: "stray", text: "x" } });
    expect(puckToPage(data, page).sections).toHaveLength(page.sections.length);
  });
});
