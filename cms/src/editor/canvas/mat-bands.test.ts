import { describe, expect, it } from "vitest";
import { bandPositions } from "./mat-bands";

describe("mat bands in the editing frame", () => {
  it("groups neighbours on the same mat, like the live page", () => {
    expect(bandPositions([null, "light", "light", "light", "dark"])).toEqual([null, "first", "mid", "last", "only"]);
  });
  it("joins across a switched-off block", () => {
    expect(bandPositions(["light", "off", "light"])).toEqual(["first", null, "last"]);
  });
});
