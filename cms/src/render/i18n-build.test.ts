import { describe, expect, it } from "vitest";
import { fixtureSite } from "../seed/fixture";
import { buildSite } from "./build";

describe("building translations", () => {
  const site = structuredClone(fixtureSite);
  site.settings.languages = ["en", "es"];
  const page = site.pages.find((p) => !p.isHome && p.status === "published" && p.sections.some((s) => s.children.some((n) => n.type === "Text")))!;
  const text = page.sections.flatMap((s) => s.children).find((n) => n.type === "Text")!;
  page.translations = { es: { status: "published", title: `${page.title} ES`, content: { [text.id]: { text: "Hola desde el huerto" } } } };

  it("writes the Spanish page at /es/…, in Spanish, linked both ways", () => {
    const files = buildSite(site, { siteUrl: "https://example.com" });
    const es = files[`es${page.slug}.html`]!;
    expect(es).toContain('<html lang="es"');
    expect(es).toContain("Hola desde el huerto");
    expect(es).toContain(`hreflang="en" href="https://example.com${page.slug}"`);
    expect(files[`${page.slug.slice(1)}.html`]).toContain(`hreflang="es" href="https://example.com/es${page.slug}"`);
    expect(files["sitemap.xml"]).toContain(`/es${page.slug}`);
  });

  it("leaves a draft translation out", () => {
    const draft = structuredClone(site);
    draft.pages.find((p) => p.id === page.id)!.translations!.es!.status = "draft";
    expect(buildSite(draft)[`es${page.slug}.html`]).toBeUndefined();
  });
});
