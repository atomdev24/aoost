import { describe, expect, it } from "vitest";
import { renderNode } from "../../test-utils";
import { AeroPhotoGrid } from "./AeroPhotoGrid";

describe("AeroPhotoGrid", () => {
  it("shows the six team photos", () => {
    const html = renderNode("AeroPhotoGrid", { ...AeroPhotoGrid.defaults.content });
    expect(html).toContain("aero_team_6");
  });
});
