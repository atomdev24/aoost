import { getComponent } from "../components/registry";
import type { Node, Page, Section } from "../schema";

/**
 * The home page: Alex's original one-page design, one aoost block per original section, in the
 * original order. Each block's default content is today's live content, so the page starts out
 * identical to the site it replaces.
 */
const BLOCKS = ["AoostHero", "AoostProjects", "AoostJournals", "AoostTools", "AoostPlaylistBand", "AoostDrawingWall", "AoostRodeo", "AoostFooter", "AoostViewer"];
const NAMES: Record<string, string> = { AoostHero: "Hero", AoostProjects: "Projects", AoostJournals: "Journals", AoostTools: "Skills", AoostPlaylistBand: "Playlists", AoostDrawingWall: "The wall", AoostRodeo: "Rodeo", AoostFooter: "Footer", AoostViewer: "Artwork viewer" };
const slug = (type: string) => type.replace(/^Aoost/, "").toLowerCase();

function block(type: string): Section | null {
  const def = getComponent(type);
  if (!def) return null; // not ported yet
  const node: Node = { id: `home-${slug(type)}-block`, type, content: structuredClone(def.defaults.content) as Record<string, unknown>, style: { base: {} } };
  // Each block is its own full-width section with no padding: the block brings the original spacing itself.
  return { id: `home-${slug(type)}`, kind: "flow", name: NAMES[type], layout: { base: { columns: 1, gap: 0, padding: "0px" } }, children: [node] };
}

export const aoostHome: Page = {
  id: "home",
  title: "Home",
  slug: "/",
  parentId: null,
  status: "published",
  template: "blank",
  seo: { title: "aoost", description: "Alex, Cape Town. Projects, playlists and a wall to draw on." },
  isHome: true,
  showInNav: false,
  // The original page is a single page with its own header; the site nav stays off it.
  hideNav: true,
  sections: BLOCKS.map(block).filter((s): s is Section => !!s),
  overlays: [],
};
