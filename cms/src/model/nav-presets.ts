import type { NavConfig, NavItem, Site } from "../schema";

/**
 * Ready-made navs. "Aerobotics": the aerobotics.com bar (logo, Products menu
 * with descriptions, the main links, Login and Request a demo), every part
 * editable afterwards in the Navigation panel.
 */
let n = 0;
const id = (s: string) => `nav_aero_${s}_${(n++).toString(36)}`;
const link = (label: string, url: string, description?: string): NavItem => ({ id: id("l"), type: "external", label, target: { kind: "url", url }, showOn: "both", hover: "tint", newTab: false, ...(description ? { description } : {}) });

export function aeroboticsNav(): Pick<NavConfig, "style" | "items" | "logoImage" | "accent" | "logoText" | "showLogoMark" | "currentMarker"> {
  const A = "https://aerobotics.com";
  return {
    style: "bar",
    logoImage: "/art/tpl_aero_logo.svg",
    logoText: "Aerobotics",
    showLogoMark: false,
    accent: "#0075E1",
    currentMarker: "pill",
    items: [
      {
        id: id("products"),
        type: "dropdown",
        label: "Products",
        showOn: "both",
        hover: "tint",
        source: "manual",
        children: [
          link("TrueFruit Size", `${A}/true-fruit-size`, "Precise fruit sizing & size forecasting"),
          link("TrueFruit Grade", `${A}/true-fruit-grade`, "Automated size, color & quality measurement"),
          link("TrueFruit Bin Scan", `${A}/true-fruit-bin-scan`, "Post-harvest size & quality classification"),
          link("Drone Scan", `${A}/drone-scan`, "High-resolution aerial crop monitoring & analysis"),
          link("Pest & Disease", `${A}/pest-and-disease`, "Digitised pest trap & disease monitoring"),
        ],
      },
      link("Pricing", `${A}/pricing`),
      link("Success stories", `${A}/success-stories`),
      link("About", `${A}/about`),
      link("Blog", `${A}/blog`),
      link("Contact", `${A}/contact`),
      { id: id("login"), type: "button", label: "Login", target: { kind: "url", url: "https://app.aerobotics.com" }, variant: "outline", showOn: "both", hover: "none" },
      { id: id("demo"), type: "button", label: "Request a demo", target: { kind: "url", url: `${A}/contact` }, variant: "filled", showOn: "both", hover: "none" },
    ],
  };
}

export const applyAeroboticsNav = (site: Site): Site => ({ ...site, nav: { ...site.nav, ...aeroboticsNav() } });
