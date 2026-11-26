import { useState } from "react";
import { deletePage, setShowInNav } from "../../model/pages";
import { newVariant } from "../workspace/PageSwitcher";
import type { Page } from "../../schema";
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
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37 1 .608 2.296.07 2.572-1.065z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeIcon = ({ off }: { off: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <path d="M1.500 8S4 3.500 8 3.500 14.500 8 14.500 8 12 12.500 8 12.500 1.500 8 1.500 8z" />
    <circle cx="8" cy="8" r="2" />
    {off ? <path d="M2.500 2.500l11 11" /> : null}
  </svg>
);
const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <circle cx="7" cy="7" r="4.500" />
    <path d="M10.500 10.500L14 14" />
  </svg>
);

type P = Page;

/**
 * The pages list as cards: one card per top-level page with a Live or Draft badge, an eye for
 * "show in the nav" and a gear for page settings. Sub-pages sit indented on a line inside their
 * parent's card, and variants show as chips under the page they belong to. Search filters by
 * title or address.
 */
export function PagesPanel() {
  const pages = useEditor((s) => s.site.pages);
  const pageId = useEditor((s) => s.pageId);
  const [creating, setCreating] = useState(false);
  const [settingsFor, setSettingsFor] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  if (settingsFor && pages.some((p) => p.id === settingsFor)) {
    return (
      <div className="ed-panel ed-page-settings">
        <PageSettings targetPageId={settingsFor} onBack={() => setSettingsFor(null)} />
      </div>
    );
  }
  const q = query.trim().toLowerCase();
  const hit = (p: P) => !q || p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
  const variantsOf = (p: P) => pages.filter((v) => v.variantOf === p.id);
  const childrenOf = (p: P) => pages.filter((c) => c.parentId === p.id && !c.variantOf);
  const tops = pages.filter((p) => !p.parentId && !p.variantOf).filter((p) => hit(p) || childrenOf(p).some(hit));
  const count = pages.filter((p) => !p.variantOf).length;

  const badge = (p: P) =>
    p.status === "published" ? <span className="ed-pbadge is-live">Live</span> : <span className="ed-pbadge is-draft">{p.status === "draft" ? "Draft" : "Unlisted"}</span>;

  const actions = (p: P) => (
    <span className="ed-pcard-tools">
      {p.isHome ? null : (
        <button
          type="button"
          className="ed-mini"
          aria-pressed={!p.showInNav}
          aria-label={`${p.showInNav ? "Hide" : "Show"} ${p.title} in the navigation`}
          title={p.showInNav ? "In the nav: click to hide it from the nav (the page still works at its address)" : "Hidden from the nav: click to show it"}
          onClick={() => update((site) => setShowInNav(site, p.id, !p.showInNav), p.showInNav ? `Hide ${p.title} from the nav` : `Show ${p.title} in the nav`)}
        >
          <EyeIcon off={!p.showInNav} />
        </button>
      )}
      <button type="button" className="ed-mini" aria-label={`New variant of ${p.title}`} title="New variant: try ideas without touching the live page" onClick={() => newVariant(p.id)}>
        <VariantIcon />
      </button>
      <button type="button" className="ed-mini" aria-label={`Page settings for ${p.title}`} title="Page settings" onClick={() => setSettingsFor(p.id)}>
        <GearIcon />
      </button>
    </span>
  );

  const variants = (p: P) => {
    const vs = variantsOf(p);
    if (!vs.length) return null;
    return (
      <div className="ed-pvariants" role="group" aria-label={`Variants of ${p.title}`}>
        <span className="ed-pvariants-label">Variants</span>
        <button type="button" className={`ed-pchip${p.id === pageId ? " is-on" : ""}`} aria-current={p.id === pageId ? "page" : undefined} onClick={() => setPage(p.id)}>
          Original
        </button>
        {vs.map((v) => (
          <span key={v.id} className={`ed-pchip${v.id === pageId ? " is-on" : ""}`}>
            <button type="button" aria-current={v.id === pageId ? "page" : undefined} onClick={() => setPage(v.id)}>
              {v.variantName}
            </button>
            <button
              type="button"
              className="ed-pchip-x"
              aria-label={`Delete ${v.variantName} of ${p.title}`}
              title="Delete this variant"
              onClick={() => window.confirm(`Delete ${v.variantName}? The page itself stays as it is.`) && update((site) => deletePage(site, v.id), `Delete ${v.variantName}`)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    );
  };

  const row = (p: P, child: boolean) => (
    <div className={`ed-prow${child ? " is-child" : ""}${p.id === pageId ? " is-selected" : ""}`}>
      <button type="button" className="ed-page" aria-current={p.id === pageId ? "page" : undefined} onClick={() => setPage(p.id)}>
        {child ? null : <span className="ed-page-icon">{p.isHome ? <HomeIcon /> : <PageIcon />}</span>}
        <span className="ed-page-text">
          <span className="ed-page-title">{p.title}</span>
          <span className="ed-page-slug">{p.slug}</span>
        </span>
      </button>
      {badge(p)}
      {actions(p)}
    </div>
  );

  return (
    <div className="ed-panel ed-pages-panel">
      <div className="ed-panel-head">
        <span className="ed-caps">{count} pages</span>
        <button type="button" className="ed-btn ed-btn-primary ed-btn-sm" onClick={() => setCreating(true)}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M6 1.500v9M1.500 6h9" />
          </svg>
          New page
        </button>
      </div>
      <label className="ed-psearch">
        <SearchIcon />
        <input type="search" placeholder="Search pages" aria-label="Search pages" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <ul className="ed-pcards">
        {tops.map((p) => {
          const kids = childrenOf(p).filter((c) => !q || hit(c) || hit(p));
          return (
            <li key={p.id} className={`ed-pcard${p.id === pageId || variantsOf(p).some((v) => v.id === pageId) ? " has-current" : ""}`}>
              {row(p, false)}
              {variants(p)}
              {kids.length ? (
                <ul className="ed-pkids">
                  {kids.map((c) => (
                    <li key={c.id}>
                      {row(c, true)}
                      {variants(c)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
        {!tops.length ? <li className="ed-empty">No pages match “{query}”.</li> : null}
      </ul>
      <p className="ed-panel-note">
        The eye shows or hides a page in the nav; hidden pages still work at their address, like /links for your Instagram bio. <VariantIcon /> makes a variant to try ideas without touching the live page.
      </p>
      {creating ? <NewPageModal onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
