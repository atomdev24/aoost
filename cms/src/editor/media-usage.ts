import type { Site } from "../schema";

/**
 * Where each media file is used, computed from the content: a map from URL to
 * the titles of the pages that mention it ("Site" for navigation, globals,
 * templates and settings). A URL counts with or without a ?w= size suffix.
 */
export function mediaUsage(site: Site, urls: string[]): Map<string, string[]> {
  const places: { title: string; text: string }[] = [
    ...site.pages.map((p) => ({ title: p.title, text: JSON.stringify(p) })),
    { title: "Site", text: JSON.stringify({ nav: site.nav, globals: site.globals, settings: site.settings, theme: site.theme, templates: site.templates }) },
  ];
  const out = new Map<string, string[]>();
  for (const url of urls) {
    const needle = JSON.stringify(url).slice(1, -1);
    out.set(
      url,
      places.filter((p) => p.text.includes(`"${needle}"`) || p.text.includes(`"${needle}?`)).map((p) => p.title),
    );
  }
  return out;
}
