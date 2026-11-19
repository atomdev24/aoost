import { describe, expect, it } from "vitest";
import { fuzzyScore, looksLikeSentence, rank, STRONG } from "./fuzzy";

describe("fuzzy ranking", () => {
  it("ranks exact over prefix over word start over inside over scattered", () => {
    const exact = fuzzyScore("publish", "publish")!;
    const prefix = fuzzyScore("pub", "publish")!;
    const word = fuzzyScore("sheet", "open the publish sheet")!;
    const inside = fuzzyScore("lish", "publish")!;
    const scattered = fuzzyScore("pbsh", "publish")!;
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(word);
    expect(word).toBeGreaterThan(inside);
    expect(inside).toBeGreaterThan(scattered);
    expect(scattered).toBeGreaterThan(0);
  });
  it("needs every letter in order", () => {
    expect(fuzzyScore("xyz", "publish")).toBeNull();
    expect(fuzzyScore("hsilbup", "publish")).toBeNull();
  });
  it("is case-insensitive and treats an empty query as matching everything", () => {
    expect(fuzzyScore("ABOUT", "About")).toBe(1000);
    expect(fuzzyScore("  ", "anything")).toBe(0);
  });
  it("sorts by score, keeps ties in order, and drops non-matches", () => {
    const items = ["Show the Desktop frame", "Publish", "Open the publish sheet", "Delete block"];
    const out = rank(items, "publish", (s) => [s]).map((r) => r.item);
    expect(out).toEqual(["Publish", "Open the publish sheet"]);
    expect(rank(["b one", "b two"], "b", (s) => [s]).map((r) => r.item)).toEqual(["b one", "b two"]);
  });
  it("counts keywords a little below the title", () => {
    const out = rank([{ t: "Zoom to 100%", k: "reset zoom" }, { t: "Reset overrides", k: "" }], "reset", (i) => [i.t, i.k]).map((r) => r.item.t);
    expect(out).toEqual(["Reset overrides", "Zoom to 100%"]);
  });
});

describe("looks like a sentence", () => {
  it("is a sentence with three or more words", () => {
    expect(looksLikeSentence("make the hero darker", 900)).toBe(true);
    expect(looksLikeSentence("add a caption", 700)).toBe(true);
  });
  it("is a search when a word or two names something", () => {
    expect(looksLikeSentence("publish", 1000)).toBe(false);
    expect(looksLikeSentence("desktop frame", STRONG + 10)).toBe(false);
  });
  it("is a sentence when nothing matches well", () => {
    expect(looksLikeSentence("rounder corners", null)).toBe(true);
    expect(looksLikeSentence("zzz", 120)).toBe(true);
  });
  it("waits for at least two characters", () => {
    expect(looksLikeSentence("", null)).toBe(false);
    expect(looksLikeSentence("q", null)).toBe(false);
  });
});
