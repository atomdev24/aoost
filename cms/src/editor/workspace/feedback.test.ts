import { describe, expect, it } from "vitest";
import { feedbackFor } from "./feedback";

describe("feedback messages", () => {
  it("speaks up for structural changes, with Undo", () => {
    expect(feedbackFor("Add Text")).toEqual({ text: "Add Text", undoable: true });
    expect(feedbackFor("Move layer")).toEqual({ text: "Move layer", undoable: true });
  });
  it("stays quiet while typing or sliding", () => {
    expect(feedbackFor("Edit Text")).toBeNull();
    expect(feedbackFor("Change padding")).toBeNull();
    expect(feedbackFor(null)).toBeNull();
  });
  it("says what an undo undid, without another Undo", () => {
    expect(feedbackFor("Undid: Add Text")).toEqual({ text: "Undone: Add Text", undoable: false });
  });
});
