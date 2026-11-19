import { describe, expect, it } from "vitest";
import { getAt, merge3, mergeFiles, pathLabel, serialize, setAt } from "./merge";

const base = { title: "Home", theme: { accent: "red", ink: "black" }, tags: ["a", "b"] };

describe("three-way merge", () => {
  it("takes a change made only in the deploy", () => {
    const r = merge3(base, base, { ...base, title: "Start" });
    expect(r).toEqual({ value: { ...base, title: "Start" }, conflicts: [] });
  });
  it("keeps a change made only in the draft", () => {
    const r = merge3(base, { ...base, theme: { ...base.theme, ink: "blue" } }, base);
    expect(r.value).toEqual({ ...base, theme: { accent: "red", ink: "blue" } });
    expect(r.conflicts).toEqual([]);
  });
  it("combines changes to different values from both sides", () => {
    const r = merge3(base, { ...base, theme: { ...base.theme, ink: "blue" } }, { ...base, theme: { ...base.theme, accent: "green" } });
    expect(r.value).toEqual({ ...base, theme: { accent: "green", ink: "blue" } });
    expect(r.conflicts).toEqual([]);
  });
  it("is fine when both sides made the same change", () => {
    const same = { ...base, title: "Start" };
    expect(merge3(base, same, same)).toEqual({ value: same, conflicts: [] });
  });
  it("keeps the draft's value on a real conflict and records it", () => {
    const r = merge3(base, { ...base, title: "Mine" }, { ...base, title: "Live" });
    expect(r.value).toEqual({ ...base, title: "Mine" });
    expect(r.conflicts).toEqual([{ path: ["title"], base: "Home", draft: "Mine", live: "Live" }]);
  });
  it("handles removed keys", () => {
    const { title: _t, ...noTitle } = base;
    expect(merge3(base, base, noTitle).value).toEqual(noTitle);
    expect(merge3(base, noTitle, base).value).toEqual(noTitle);
    const r = merge3(base, noTitle, { ...base, title: "Live" });
    expect(r.value).toEqual(noTitle);
    expect(r.conflicts).toEqual([{ path: ["title"], base: "Home", draft: undefined, live: "Live" }]);
    // Added on one side only.
    expect(merge3(base, base, { ...base, extra: 1 }).value).toEqual({ ...base, extra: 1 });
  });
  it("treats an array without ids as one value", () => {
    const r = merge3(base, { ...base, tags: ["a", "b", "c"] }, { ...base, tags: ["b"] });
    expect(r.value).toEqual({ ...base, tags: ["a", "b", "c"] });
    expect(r.conflicts).toEqual([{ path: ["tags"], base: ["a", "b"], draft: ["a", "b", "c"], live: ["b"] }]);
    expect(merge3(base, base, { ...base, tags: ["z"] }).value).toEqual({ ...base, tags: ["z"] });
  });

  describe("arrays of items with ids", () => {
    const a = { id: "a", text: "A" };
    const b = { id: "b", text: "B" };
    const c = { id: "c", text: "C" };
    const list = [a, b, c];
    it("merges edits to different items from each side", () => {
      const r = merge3(list, [{ ...a, text: "A2" }, b, c], [a, b, { ...c, text: "C2" }]);
      expect(r.value).toEqual([{ ...a, text: "A2" }, b, { ...c, text: "C2" }]);
      expect(r.conflicts).toEqual([]);
    });
    it("records a clash inside an item by its id", () => {
      const r = merge3(list, [a, { ...b, text: "mine" }, c], [a, { ...b, text: "live" }, c]);
      expect(r.conflicts).toEqual([{ path: [{ id: "b" }, "text"], base: "B", draft: "mine", live: "live" }]);
    });
    it("keeps items added on either side, after their neighbour", () => {
      const d = { id: "d" };
      const e = { id: "e" };
      const r = merge3(list, [a, d, b, c], [a, b, c, e]);
      expect(r.value).toEqual([a, d, b, c, e]);
    });
    it("drops items removed on one side", () => {
      expect(merge3(list, [a, c], [a, b, { ...c, text: "C2" }]).value).toEqual([a, { ...c, text: "C2" }]);
      expect(merge3(list, [{ ...a, text: "A2" }, b, c], [a, c]).value).toEqual([{ ...a, text: "A2" }, c]);
    });
    it("records removed-here, edited-there as a conflict and keeps the draft", () => {
      const r = merge3(list, [a, c], [a, { ...b, text: "B2" }, c]);
      expect(r.value).toEqual([a, c]);
      expect(r.conflicts).toEqual([{ path: [{ id: "b" }], base: b, draft: undefined, live: { ...b, text: "B2" } }]);
    });
    it("follows a reorder from either side", () => {
      expect(merge3(list, list, [c, a, b]).value).toEqual([c, a, b]);
      expect(merge3(list, [c, a, b], [a, b, { ...c, text: "C2" }]).value).toEqual([{ ...c, text: "C2" }, a, b]);
    });
  });
});

describe("merging content files", () => {
  const f = (v: unknown) => serialize(v);
  it("adds files from the deploy, drops files deleted in the draft, keeps draft text when unchanged", () => {
    const b = { "content/site.json": f({ a: 1 }), "content/pages/old.json": f({ id: "old" }) };
    const draftText = '{"a":1,"b":2}\n';
    const draft = { "content/site.json": draftText };
    const live = { ...b, "content/pages/new.json": f({ id: "new" }) };
    const r = mergeFiles(b, draft, live);
    expect(r.files).toEqual({ "content/site.json": draftText, "content/pages/new.json": f({ id: "new" }) });
    expect(r.conflicts).toEqual([]);
  });
  it("prefixes conflicts with their file", () => {
    const b = { "content/site.json": f({ a: 1 }) };
    const r = mergeFiles(b, { "content/site.json": f({ a: 2 }) }, { "content/site.json": f({ a: 3 }) });
    expect(r.conflicts).toEqual([{ file: "content/site.json", path: ["a"], base: 1, draft: 2, live: 3 }]);
    expect(JSON.parse(r.files["content/site.json"]!)).toEqual({ a: 2 });
  });
});

describe("paths", () => {
  const doc = { sections: [{ id: "s1", children: [{ id: "n1", props: { title: "x" } }] }] };
  it("reads and writes by key and id, and removes with undefined", () => {
    const path = ["sections", { id: "s1" }, "children", { id: "n1" }, "props", "title"];
    expect(getAt(doc, path)).toBe("x");
    const next = setAt(doc, path, "y");
    expect(getAt(next, path)).toBe("y");
    expect(getAt(doc, path)).toBe("x");
    const gone = setAt(doc, ["sections", { id: "s1" }, "children", { id: "n1" }], undefined);
    expect(getAt(gone, ["sections", { id: "s1" }, "children"])).toEqual([]);
    expect(getAt(doc, ["nope", { id: "z" }])).toBeUndefined();
  });
  it("labels a path for people", () => {
    expect(pathLabel("content/pages/home.json", ["sections", { id: "hero-1" }, "props", "title"])).toBe("pages/home.json › sections › hero-1 › props › title");
  });
});
