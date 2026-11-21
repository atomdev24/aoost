import { useState } from "react";
import { deletePage, setShowInNav } from "../../model/pages";
import { newVariant } from "../workspace/PageSwitcher";
import { setPage, update, useEditor } from "../store";
import { NewPageModal } from "./NewPageModal";
import { PageSettings } from "./PageSettings";

const HomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.500 7.500L8 3l5.500 4.500V13h-11z" />
  </svg>
);
const PageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 1.500h5.500L12.500 4.500V14.500H4z" />
  </svg>
);

const VariantIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="4.5" width="8" height="9.5" rx="1.5" />
    <path d="M6 2h6.5A1.5 1.5 0 0 1 14 3.5V11" />
  </svg>
);

const GearIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <circle cx="8" cy="8" r="2.2" />
    <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
  </svg>
);

/**
 * The pages list: home, nested sub-pages, a nav toggle per page, and a
 * "Page settings" action per page that opens that page's settings in place.
 */
export function PagesPanel() {
  const pages = useEditor((s) => s.site.pages);
  const pageId = useEditor((s) => s.pageId);
  const [creating, setCreating] = useState(false);
  const [settingsFor, setSettingsFor] = useState<string | null>(null);
  if (settingsFor && pages.some((p) => p.id === settingsFor)) {
    return (
      <div className="ed-panel ed-page-settings">
        <PageSettings targetPageId={settingsFor} onBack={() => setSettingsFor(null)} />
      </div>
    );
  }
  // Each page, then its variants, then its sub-pages (each with their variants).
  const withVariants = (p: (typeof pages)[number]) => [p, ...pages.filter((v) => v.variantOf === p.id)];
  const ordered = pages.filter((p) => !p.parentId && !p.variantOf).flatMap((p) => [...withVariants(p), ...pages.filter((c) => c.parentId === p.id && !c.variantOf).flatMap(withVariants)]);
  const count = pages.filter((p) => !p.variantOf).length;

  return (
    <div className="ed-panel">
      <div className="ed-panel-head">
        <span className="ed-caps">{count} pages</span>
        <button type="button" className="ed-btn ed-btn-primary ed-btn-sm" onClick={() => setCreating(true)}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M6 1.500v9M1.500 6h9" />
          </svg>
          New page
        </button>
      </div>
      <ul className="ed-pages">
        {ordered.map((p) =>
          p.variantOf ? (
            <li key={p.id} className={`ed-page-row ed-page-variant${p.id === pageId ? " is-selected" : ""}`}>
              <button type="button" className="ed-page" aria-current={p.id === pageId ? "page" : undefined} onClick={() => setPage(p.id)}>
                <span className="ed-page-icon ed-variant-mark" aria-hidden="true" />
                <span className="ed-page-text">
                  <span className="ed-page-title">{p.variantName}</span>
                  <span className="ed-page-slug">Variant of {p.title}</span>
                </span>
              </button>
              <button
                type="button"
                className="ed-mini"
                aria-label={`Delete ${p.variantName} of ${p.title}`}
                title="Delete this variant"
                onClick={() => window.confirm(`Delete ${p.variantName}? The page itself stays as it is.`) && update((site) => deletePage(site, p.id), `Delete ${p.variantName}`)}
              >
                ×
              </button>
            </li>
          ) : (
          <li key={p.id} className={`ed-page-row${p.parentId ? " ed-page-child" : ""}${p.id === pageId ? " is-selected" : ""}`}>
            <button type="button" className="ed-page" aria-current={p.id === pageId ? "page" : undefined} onClick={() => setPage(p.id)}>
              <span className="ed-page-icon">{p.isHome ? <HomeIcon /> : <PageIcon />}</span>
              <span className="ed-page-text">
                <span className="ed-page-title">
                  {p.title}
                  {p.status !== "published" ? <em>{p.status === "draft" ? "Draft" : "Unlisted"}</em> : null}
                </span>
                <span className="ed-page-slug">{p.slug}</span>
              </span>
            </button>
            <button
              type="button"
              className="ed-mini ed-page-variant-btn"
              aria-label={`New variant of ${p.title}`}
              title="New variant: try ideas without touching the live page"
              onClick={() => newVariant(p.id)}
            >
              <VariantIcon />
            </button>
            <button
              type="button"
              className="ed-mini ed-page-settings-btn"
              aria-label={`Page settings for ${p.title}`}
              title="Page settings"
              onClick={() => setSettingsFor(p.id)}
            >
              <GearIcon />
            </button>
            {p.isHome ? (
              <span className="ed-page-note">Logo link</span>
            ) : (
              <button
                type="button"
                className="ed-navtoggle"
                aria-pressed={p.showInNav}
                aria-label={`Show ${p.title} in navigation`}
                onClick={() => update((site) => setShowInNav(site, p.id, !p.showInNav), p.showInNav ? `Hide ${p.title} from the nav` : `Show ${p.title} in the nav`)}
              >
                {p.showInNav ? "In nav" : "Hidden"}
                <span className="ed-toggle" data-on={p.showInNav || undefined}>
                  <span />
                </span>
              </button>
            )}
          </li>
          ),
        )}
      </ul>
      <p className="ed-panel-note">
        <VariantIcon /> next to a page makes a variant: a copy to try ideas on without touching the live page. Pages left out of the nav still work at their URL, so you can keep secret pages like /links for your Instagram bio.
      </p>
      {creating ? <NewPageModal onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
