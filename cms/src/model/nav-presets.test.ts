import { describe, expect, it } from "vitest";
import type { NavItem } from "../schema";
import { aeroboticsNav } from "./nav-presets";

const urls = (items: NavItem[]): Record<string, string> =>
  Object.fromEntries(items.flatMap((i) => [...("target" in i && i.target?.kind === "url" ? [[i.label, i.target.url]] : []), ...Object.entries(urls(("children" in i && i.children) || []))]));

describe("Aerobotics nav preset", () => {
  it("links every item to the page aerobotics.com uses", () => {
    expect(urls(aeroboticsNav().items)).toEqual({
      "TrueFruit Size": "https://aerobotics.com/true-fruit-size",
      "TrueFruit Grade": "https://aerobotics.com/true-fruit-grade",
      "TrueFruit Bin Scan": "https://aerobotics.com/true-fruit-bin-scan",
      "Drone Scan": "https://aerobotics.com/drone-scan",
      "Pest & Disease": "https://aerobotics.com/pest-and-disease",
      Pricing: "https://aerobotics.com/pricing",
      "Success stories": "https://aerobotics.com/success-stories",
      About: "https://aerobotics.com/about-us",
      Blog: "https://blog.aerobotics.com/",
      Contact: "https://aerobotics.com/contact-us",
      Login: "https://app.aerobotics.com/log-in",
      "Request a demo": "https://aerobotics.com/request-a-demo",
    });
  });
});
