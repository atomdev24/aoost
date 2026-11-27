import { describe, expect, it } from "vitest";
import { hiddenList, marksFrom } from "./marks";

describe("board marks", () => {
  it("keeps everything on unless switched off", () => {
    expect(marksFrom(null)).toEqual({ comments: true, changes: true, motion: true, edits: true });
    expect(marksFrom({ motion: false, junk: 1 })).toEqual({ comments: true, changes: true, motion: false, edits: true });
  });
  it("lists what's hidden for the frames", () => {
    expect(hiddenList({ comments: true, changes: false, motion: false, edits: true })).toBe("changes motion");
  });
});
