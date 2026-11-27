import { describe, expect, it } from "vitest";
import { findField, setField, takesMarks, wordFields } from "./field-locate";

const content = {
  title: "Our Story",
  body: "James grew up on a **farm**.\n\nToday we measure [fruit](/fruit).",
  image: "/media/a.jpg",
  align: "left",
  items: [{ name: "Packouts", text: "See *every* fruit", icon: "leaf" }],
  cta: { label: "Book a demo", href: "/demo" },
};

describe("finding the field a bit of text came from", () => {
  it("lists only words fields", () => {
    expect(wordFields(content).map((f) => f.path.join("."))).toEqual(["title", "body", "items.0.name", "items.0.text", "cta.label"]);
  });
  it("matches exactly what a visitor reads", () => {
    expect(findField(content, "  Our   story ")).toMatchObject({ path: ["title"], paragraphs: false });
    expect(findField(content, "See every fruit")).toMatchObject({ path: ["items", 0, "text"] });
    expect(findField(content, "Book a demo")).toMatchObject({ path: ["cta", "label"] });
  });
  it("matches one paragraph of a longer field", () => {
    expect(findField(content, "Today we measure fruit.")).toMatchObject({ path: ["body"], paragraphs: true });
  });
  it("ignores what isn't a field's words", () => {
    expect(findField(content, "01")).toBeNull();
    expect(findField(content, "left")).toBeNull();
    expect(findField(content, "")).toBeNull();
  });
  it("sets one field and copies only the way there", () => {
    const next = setField(content, ["items", 0, "text"], "New");
    expect(next.items[0]!.text).toBe("New");
    expect(next.cta).toBe(content.cta);
    expect(content.items[0]!.text).toBe("See *every* fruit");
  });
});

describe("which fields take formatting", () => {
  it("is the ones the block draws with marks", () => {
    expect(takesMarks("AeroFaq", ["items", 2, "answer"])).toBe(true);
    expect(takesMarks("AeroFaq", ["items", 2, "question"])).toBe(false);
    expect(takesMarks("AoostProjects", ["heading"])).toBe(false);
  });
  it("matches words shown inside quote marks", () => {
    expect(findField({ quote: "Measuring thousands" }, "“Measuring thousands”")).toMatchObject({ path: ["quote"] });
  });
});
