import { describe, expect, it } from "vitest";
import "../components/registry";
import { fixtureSite } from "../seed/fixture";
import { createNode } from "./page-ops";
import { blockDefault, blockFromSaved, clearBlockDefault, duplicateSaved, renameSaved, saveBlock, savedBlocks, setBlockDefault } from "./saved-blocks";

describe("saved blocks", () => {
  const site = fixtureSite;
  const node = { ...createNode("Text", { content: { text: "Hello there" } }), locked: true };

  it("saves, renames, duplicates and adds a block back with a new id", () => {
    const a = saveBlock(site, node, "Greeting");
    expect(savedBlocks(a.site).map((t) => t.name)).toEqual(["Greeting"]);
    const b = renameSaved(a.site, a.id, "  Hello block ");
    expect(savedBlocks(b).map((t) => t.name)).toEqual(["Hello block"]);
    const c = duplicateSaved(b, a.id);
    expect(savedBlocks(c.site).map((t) => t.name)).toEqual(["Hello block", "Hello block copy"]);
    const added = blockFromSaved(c.site, c.id)!;
    expect(added.content.text).toBe("Hello there");
    expect(added.id).not.toBe(node.id);
    expect(added.locked).toBeUndefined();
  });

  it("sets and clears what new blocks of a type start with", () => {
    expect(blockDefault(site, "Text")).toBeNull();
    const withDefault = setBlockDefault(site, { ...node, style: { base: { textAlign: "center" } } } as never);
    expect(blockDefault(withDefault, "Text")).toEqual({ content: node.content, style: { textAlign: "center" } });
    const again = setBlockDefault(withDefault, createNode("Text", { content: { text: "Second" } }));
    expect(again.templates.filter((t) => t.kind === "default")).toHaveLength(1);
    expect(blockDefault(again, "Text")!.content.text).toBe("Second");
    expect(blockDefault(clearBlockDefault(again, "Text"), "Text")).toBeNull();
  });
});
