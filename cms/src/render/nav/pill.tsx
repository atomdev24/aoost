import type { ReactElement } from "react";
import type { RenderCtx } from "../../components/types";
import { Icon } from "../icons";
import { sandboxDoc } from "../sandbox";
import { SectionView } from "../SectionView";
import { hasMenuLinks, resolveNav, type ResolvedItem } from "./model";
import { css } from "./pill.styles";
import type { NavRenderer } from "./types";

const linkProps = (item: ResolvedItem, ctx: RenderCtx) => ({
  href: ctx.editing ? undefined : item.href,
  "aria-label": item.ariaLabel,
  "aria-current": item.current && item.type !== "section" ? ("page" as const) : undefined,
  "data-section": item.type === "section" ? item.href?.split("#")[1] : undefined,
  ...(item.newTab || (item.external && item.newTab !== false) ? { target: "_blank", rel: "noopener" } : {}),
});

function Label({ item }: { item: ResolvedItem }): ReactElement {
  return (
    <>
      {item.icon?.position === "left" ? <Icon name={item.icon.name} size={14} /> : null}
      <span>{item.label}</span>
      {item.icon?.position === "right" ? <Icon name={item.icon.name} size={14} /> : null}
      {item.badge ? (
        <span className="nav-badge" data-expires={item.badge.expires}>
          {item.badge.text}
        </span>
      ) : null}
    </>
  );
}

function Socials({ ctx, labelled }: { ctx: RenderCtx; labelled?: boolean }): ReactElement {
  return (
    <>
      {ctx.site.settings.socials.map((s) => (
        <a key={s.network} className={labelled ? "sheet-social" : "pill-icon"} href={ctx.editing ? undefined : s.url} target="_blank" rel="noopener" aria-label={labelled ? undefined : (s.label ?? s.network)}>
          {labelled ? (s.label ?? s.network) : <Icon name={s.network in { instagram: 1, spotify: 1, youtube: 1, soundcloud: 1, tiktok: 1 } ? s.network : "link"} />}
        </a>
      ))}
    </>
  );
}

function Embed({ item }: { item: ResolvedItem }): ReactElement {
  return <iframe className="nav-embed" sandbox="allow-scripts" title={item.label || "Embedded content"} data-frame={item.id} srcDoc={sandboxDoc({ html: item.code }, item.id)} loading="lazy" />;
}

/** One entry inside a dropdown menu (desktop) or accordion (mobile). */
function MenuEntry({ item, ctx, menu }: { item: ResolvedItem; ctx: RenderCtx; menu: boolean }): ReactElement | null {
  if (item.type === "label") return item.divider ? <hr className="menu-rule" /> : <span className="menu-label t-label">{item.label}</span>;
  if (item.type === "embed") return <Embed item={item} />;
  if (item.type === "social") return <span className="menu-social"><Socials ctx={ctx} /></span>;
  if (!item.href) return null;
  return (
    <a className="menu-link" role={menu ? "menuitem" : undefined} {...linkProps(item, ctx)}>
      <Label item={item} />
    </a>
  );
}

/** A top-level item in the desktop pill. */
function PillItem({ item, ctx }: { item: ResolvedItem; ctx: RenderCtx }): ReactElement | null {
  const cls = `pill-link hv-${item.hover}`;
  const menuId = `menu-${item.id}`;
  switch (item.type) {
    case "page":
    case "section":
    case "external":
      if (!item.children.length) {
        return (
          <a className={cls} {...linkProps(item, ctx)}>
            <Label item={item} />
          </a>
        );
      }
    // A page with sub-pages: the link still goes to the page, the caret opens the menu.
    // falls through
    case "dropdown":
      return (
        <div className="has-menu" data-menu>
          {item.href && item.type !== "dropdown" ? (
            <a className={`${cls} pill-split`} {...linkProps(item, ctx)}>
              <Label item={item} />
            </a>
          ) : null}
          <button
            type="button"
            className={item.href && item.type !== "dropdown" ? "pill-caret" : `${cls} pill-trigger`}
            aria-haspopup="true"
            aria-expanded="false"
            aria-controls={menuId}
            aria-label={item.href && item.type !== "dropdown" ? `${item.label} submenu` : item.ariaLabel}
            data-current={item.current && item.type === "dropdown" ? "" : undefined}
          >
            {item.href && item.type !== "dropdown" ? null : <Label item={item} />}
            <Icon name="caret" />
          </button>
          <div className="menu" id={menuId} role="menu" aria-label={item.label} hidden>
            {item.children.map((c) => (
              <MenuEntry key={c.id} item={c} ctx={ctx} menu />
            ))}
          </div>
        </div>
      );
    case "mega":
      return (
        <div className="has-menu" data-menu data-mega>
          <button type="button" className={`${cls} pill-trigger`} aria-expanded="false" aria-controls={menuId} aria-label={item.ariaLabel}>
            <Label item={item} />
            <Icon name="caret" />
          </button>
          <div className="menu mega" id={menuId} hidden>
            {(item.panel ?? []).map((s) => (
              <SectionView key={s.id} section={s} overlays={[]} ctx={ctx} />
            ))}
          </div>
        </div>
      );
    case "button":
      return (
        <a className={`pill-cta pill-cta-${item.variant ?? "filled"}`} {...linkProps(item, ctx)}>
          <Label item={item} />
        </a>
      );
    case "social":
      return <Socials ctx={ctx} />;
    case "search":
      return (
        <button type="button" className="pill-icon" data-search-open aria-label={item.ariaLabel ?? "Search"}>
          <Icon name="search" />
        </button>
      );
    case "embed":
      return <Embed item={item} />;
    case "label":
      return item.divider ? <span className="pill-rule" aria-hidden="true" /> : <span className="pill-label t-label">{item.label}</span>;
  }
}

/** A top-level item in the mobile full-screen menu. */
function SheetItem({ item, ctx }: { item: ResolvedItem; ctx: RenderCtx }): ReactElement | null {
  const accId = `acc-${item.id}`;
  switch (item.type) {
    case "page":
    case "section":
    case "external":
    case "dropdown":
      if (!item.children.length) {
        return item.href ? (
          <a className="sheet-link" {...linkProps(item, ctx)}>
            <Label item={item} />
          </a>
        ) : null;
      }
      return (
        <div className="sheet-group">
          <div className="sheet-row">
            {item.href && item.type !== "dropdown" ? (
              <a className="sheet-link" {...linkProps(item, ctx)}>
                <Label item={item} />
              </a>
            ) : (
              <span className="sheet-link">
                <Label item={item} />
              </span>
            )}
            <button type="button" className="sheet-acc" aria-expanded={item.current ? "true" : "false"} aria-controls={accId} aria-label={`${item.label} submenu`}>
              <Icon name="caret" size={16} />
            </button>
          </div>
          <div className="sheet-sub" id={accId} hidden={!item.current}>
            {item.children.map((c) => (
              <MenuEntry key={c.id} item={c} ctx={ctx} menu={false} />
            ))}
          </div>
        </div>
      );
    case "mega":
      return (
        <div className="sheet-group">
          <div className="sheet-row">
            <span className="sheet-link">
              <Label item={item} />
            </span>
            <button type="button" className="sheet-acc" aria-expanded="false" aria-controls={accId} aria-label={`${item.label} submenu`}>
              <Icon name="caret" size={16} />
            </button>
          </div>
          <div className="sheet-sub sheet-mega" id={accId} hidden>
            {(item.panel ?? []).map((s) => (
              <SectionView key={s.id} section={s} overlays={[]} ctx={ctx} />
            ))}
          </div>
        </div>
      );
    case "button":
      return (
        <a className={`sheet-cta pill-cta-${item.variant ?? "filled"}`} {...linkProps(item, ctx)}>
          <Label item={item} />
        </a>
      );
    case "search":
      return (
        <button type="button" className="sheet-link sheet-search" data-search-open>
          <Icon name="search" size={22} />
          <span>{item.label || "Search"}</span>
        </button>
      );
    case "embed":
      return <Embed item={item} />;
    case "label":
      return item.divider ? <hr className="sheet-rule" /> : <span className="sheet-label t-label">{item.label}</span>;
    case "social":
      return null; // socials always sit at the bottom of the sheet
  }
}

function Logo({ ctx }: { ctx: RenderCtx }): ReactElement {
  const home = ctx.site.pages.find((p) => p.isHome);
  const text = ctx.site.nav.logoText.trim();
  return (
    <a
      className={`pill-logo${text ? "" : " mark-only"}`}
      href={ctx.editing ? undefined : ctx.href({ kind: "page", pageId: home?.id ?? "home" })}
      aria-label={text ? `${text} home` : "Home"}
      aria-current={ctx.page?.isHome ? "page" : undefined}
    >
      {/* With no logo text the symbol is the whole logo, so it always shows then. */}
      {ctx.site.nav.showLogoMark || !text ? <Icon name="sun" size={20} /> : null}
      {text ? <span>{text}</span> : null}
    </a>
  );
}

function PillNav({ ctx }: { ctx: RenderCtx }): ReactElement {
  const items = resolveNav(ctx);
  const nav = ctx.site.nav;
  const desktop = items.filter((i) => i.showOn !== "mobile");
  const mobile = items.filter((i) => i.showOn !== "desktop");
  const hasSearch = items.some((i) => i.type === "search");
  // No page to go to yet (e.g. every other page is still a draft): just the logo, and no Menu that opens onto nothing.
  const hasMenu = hasMenuLinks(mobile);
  return (
    <>
      <header className="nav" data-nav="pill" data-hide={nav.hideOnScroll ? "" : undefined} data-marker={nav.currentMarker}>
        <div className="pill">
          <Logo ctx={ctx} />
          <nav className="pill-links" aria-label="Main">
            {desktop.map((i) => (
              <PillItem key={i.id} item={i} ctx={ctx} />
            ))}
          </nav>
          {hasMenu ? (
            <button type="button" className="pill-menu" aria-expanded="false" aria-controls="nav-sheet">
              Menu
            </button>
          ) : null}
        </div>
      </header>
      {hasMenu ? (
        <div className="sheet" id="nav-sheet" role="dialog" aria-modal="true" aria-label="Menu" hidden>
          <div className="sheet-top">
            <Logo ctx={ctx} />
            <button type="button" className="sheet-close" aria-label="Close menu">
              <Icon name="close" />
            </button>
          </div>
          <nav className="sheet-links" aria-label="Main, mobile">
            {mobile.map((i) => (
              <SheetItem key={i.id} item={i} ctx={ctx} />
            ))}
          </nav>
          {ctx.site.settings.socials.length ? (
            <div className="sheet-foot">
              <Socials ctx={ctx} labelled />
            </div>
          ) : null}
        </div>
      ) : null}
      {hasSearch ? (
        <div className="search" id="nav-search" role="dialog" aria-modal="true" aria-label="Search" hidden>
          <div className="search-box">
            <label className="sr" htmlFor="nav-search-input">
              Search pages, diary entries and artwork
            </label>
            <input id="nav-search-input" type="search" placeholder="Search the diary…" autoComplete="off" />
            <button type="button" className="search-close" aria-label="Close search">
              <Icon name="close" size={16} />
            </button>
            <ul className="search-results" aria-live="polite" />
          </div>
        </div>
      ) : null}
    </>
  );
}

export const pillNav: NavRenderer = { style: "pill", Render: PillNav, css };
