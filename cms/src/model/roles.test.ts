import { describe, expect, it } from "vitest";
import { actionFor, can, cleanTeam, keepSaverOwner, roleFor } from "./roles";

describe("roles", () => {
  it("lets each role do what the roadmap and the interview agreed", () => {
    expect(can("viewer", "comment")).toBe(true);
    expect(can("viewer", "edit")).toBe(false);
    expect(can("editor", "publish")).toBe(true);
    expect(can("editor", "promote")).toBe(false);
    expect(can("manager", "promote")).toBe(true);
    expect(can("manager", "team")).toBe(false);
    expect(can("owner", "team")).toBe(true);
  });
  it("maps editor API calls to what they need", () => {
    expect(actionFor("GET /site")).toBeNull();
    expect(actionFor("POST /ops")).toBe("edit");
    expect(actionFor("POST /comments")).toBe("comment");
    expect(actionFor("POST /publish")).toBe("publish");
    expect(actionFor("POST /staging/push")).toBe("promote");
    expect(actionFor("PUT /team")).toBe("team");
  });
  it("works out someone's role", () => {
    const opts = { owners: ["alex@aerobotics.com"], team: { "jess@aerobotics.com": "manager" as const, "*@aerobotics.com": "editor" as const }, fallback: "viewer" as const };
    expect(roleFor({ via: "session", who: "editor" }, opts)).toBe("owner");
    expect(roleFor({ via: "access", who: "Alex@Aerobotics.com" }, opts)).toBe("owner");
    expect(roleFor({ via: "access", who: "jess@aerobotics.com" }, opts)).toBe("manager");
    expect(roleFor({ via: "access", who: "sam@aerobotics.com" }, opts)).toBe("editor");
    expect(roleFor({ via: "access", who: "guest@agency.com" }, opts)).toBe("viewer");
  });
  it("keeps everyone an owner until a team is set up, and the saver stays owner", () => {
    expect(roleFor({ via: "access", who: "alex@x.com" }, { owners: [], team: {}, fallback: "viewer" })).toBe("owner");
    expect(keepSaverOwner({ "jess@x.com": "editor" }, { via: "access", who: "Alex@x.com" }, [])).toEqual({ "jess@x.com": "editor", "alex@x.com": "owner" });
    expect(keepSaverOwner({}, { via: "session", who: "editor" }, [])).toEqual({});
  });
  it("cleans the team list", () => {
    expect(cleanTeam({ " Jess@X.com ": "editor", bad: "owner", "a@b.co": "boss" })).toEqual({ "jess@x.com": "editor" });
    expect(cleanTeam({ "*@aerobotics.com": "editor", "x*y@z.com": "editor" })).toEqual({ "*@aerobotics.com": "editor" });
  });
});
