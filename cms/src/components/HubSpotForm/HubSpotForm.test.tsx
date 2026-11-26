import { describe, expect, it } from "vitest";
import { renderNode } from "../test-utils";
import { parseHubSpot } from "./HubSpotForm";

const EMBED = `<script charset="utf-8" type="text/javascript" src="//js.hsforms.net/forms/embed/v2.js"></script>
<script>hbspt.forms.create({ region: "eu1", portalId: "1234567", formId: "0a1b2c3d-1111-2222-3333-444455556666" });</script>`;

describe("HubSpotForm", () => {
  it("reads the ids from a pasted embed code", () => {
    expect(parseHubSpot(EMBED)).toEqual({ portalId: "1234567", formId: "0a1b2c3d-1111-2222-3333-444455556666", region: "eu1" });
  });
  it("loads HubSpot's form on the live page", () => {
    const html = renderNode("HubSpotForm", { embed: EMBED, portalId: "", formId: "", region: "na1" });
    expect(html).toContain("js.hsforms.net/forms/embed/v2.js");
    expect(html).toContain('"portalId":"1234567"');
    expect(html).toContain('"region":"eu1"');
  });
  it("renders nothing on the live page until it has ids", () => {
    expect(renderNode("HubSpotForm", { portalId: "", formId: "", region: "na1" })).toBe("");
  });
});
