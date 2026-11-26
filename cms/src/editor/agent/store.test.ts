import { describe, expect, it } from "vitest";
import { nextView, type AgentView } from "./store";

const idle: AgentView = { state: "idle", text: "", nodeIds: [], at: 0 };

describe("Claude's working state in the editor", () => {
  it("shows what Claude is doing and on which blocks", () => {
    const v = nextView(idle, { state: "working", text: "Changing a block", pageId: "home", nodeIds: ["h1"] }, 1);
    expect(v).toMatchObject({ state: "working", text: "Changing a block", pageId: "home", nodeIds: ["h1"] });
  });
  it("keeps the glow on the last blocks until Claude names others", () => {
    const a = nextView(idle, { state: "working", text: "Changing a block", nodeIds: ["h1"] }, 1);
    expect(nextView(a, { state: "working", text: "Looking at the page" }, 2).nodeIds).toEqual(["h1"]);
    expect(nextView(a, { state: "done", text: "Done" }, 3).nodeIds).toEqual(["h1"]);
  });
});
