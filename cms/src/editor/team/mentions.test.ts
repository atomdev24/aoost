import { describe, expect, it } from "vitest";
import { completeMention, mentionQuery } from "./mention-text";

describe("@mentions", () => {
  it("spots the handle being typed", () => {
    expect(mentionQuery("Can @je")).toBe("je");
    expect(mentionQuery("@")).toBe("");
    expect(mentionQuery("mail me at a@b")).toBeNull();
    expect(mentionQuery("no mention")).toBeNull();
  });
  it("completes it with the person's handle", () => {
    expect(completeMention("Can @je", "jess@aerobotics.com")).toBe("Can @jess ");
  });
});
