import { instantiate } from "../../model/library";
import type { Section } from "../../schema";
import type { SiteTemplate } from "./site-templates";
import homeConcept from "./snapshots/home-concept.json";

type Snapshot = { from: string; savedAt: string; hideNav: boolean; sections: unknown[] };

/** A page saved from the demo, with fresh ids each time; links to its own sections (#id) follow them. */
export function fromSnapshot(snap: Snapshot): Section[] {
  const source = snap.sections as Section[];
  const sections = instantiate(source);
  const ids = new Map(source.map((s, i) => [`#${s.id}`, `#${sections[i]!.id}`]));
  return JSON.parse(JSON.stringify(sections), (_k, v) => (typeof v === "string" && ids.has(v) ? ids.get(v) : v)) as Section[];
}

/** The first picture in a snapshot (a section background or an image block), for the panel's card. */
const firstPicture = (snap: Snapshot) => /"(\/(?:art|media)\/[^"]+\.(?:webp|jpe?g|png))"/.exec(JSON.stringify(snap.sections))?.[1] ?? "/art/aero_hero_home.webp";

const when = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * Pages saved from the demo as templates (cms/scripts/snapshot-template.ts). The homepage concept
 * shows the features being explored for the Aerobotics home page; refresh it by running the script again.
 */
export const SNAPSHOT_TEMPLATES: SiteTemplate[] = [
  {
    id: "aero-home-concept",
    name: "Homepage concept",
    hint: `The demo's Home page as saved on ${when(homeConcept.savedAt)}: the features being explored for the home page`,
    thumb: firstPicture(homeConcept),
    hideNav: homeConcept.hideNav,
    nav: "aerobotics",
    sections: () => fromSnapshot(homeConcept),
  },
];
