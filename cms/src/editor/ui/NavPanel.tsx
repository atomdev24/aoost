import { useState } from "react";
import { addNavItem, MENU_CHILD_TYPES, moveNavItem, NAV_TYPE_LABELS, removeNavItem, setNavBehaviour, updateNavItem } from "../../model/nav";
import { ICON_NAMES } from "../../render/icons";
import { NAV_ITEM_TYPES, type NavItem, type Site } from "../../schema";
import { LinkField } from "../fields/LinkField";
import { MediaInput } from "../fields/media";
import { applyAeroboticsNav } from "../../model/nav-presets";
import { megaPageId, setPage, update, useEditor } from "../store";
import { Segmented, Select, TextInput, Toggle } from "./kit";

const edit = (id: string, patch: Partial<NavItem>, label = "Edit nav item") => update((s) => updateNavItem(s, id, patch), label, { merge: `nav:${id}:${Object.keys(patch).join()}` });

function describe(item: NavItem, site: Site): { title: string; sub: string } {
  const page = item.target && (item.target.kind === "page" || item.target.kind === "section") ? site.pages.find((p) => p.id === (item.target as { pageId: string }).pageId) : undefined;
  const title = item.label || page?.title || NAV_TYPE_LABELS[item.type];
  const t = item.target;
  const to = !t ? "" : t.kind === "page" ? `links to ${page?.slug ?? "?"}` : t.kind === "section" ? `links to ${page?.slug ?? "?"}#…` : t.kind === "url" ? `links to ${t.url}` : `emails ${t.email}`;
  return { title, sub: [NAV_TYPE_LABELS[item.type], to].filter(Boolean).join(" · ") };
}

/**
 * Navigation settings (right panel): the items in the bar, in order, each
 * with its settings (SPEC §6), plus how the nav behaves.
 */
export function NavPanel() {
  const site = useEditor((s) => s.site);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState("");
  const nav = site.nav;

  return (
    <>
      <div className="ed-side-section">
        <h3>Navigation</h3>
        <p className="ed-hint">Shared across every page. The order here is the order in the bar.</p>
      </div>
      <div className="ed-navitems">
        {nav.items.map((item, i) => (
          <ItemCard key={item.id} item={item} site={site} first={i === 0} last={i === nav.items.length - 1} open={open} setOpen={setOpen} />
        ))}
        <Select
          ariaLabel="Add a nav item"
          value={adding}
          options={[{ value: "", label: "+ Add a nav item…" }, ...NAV_ITEM_TYPES.map((t) => ({ value: t, label: NAV_TYPE_LABELS[t] }))]}
          onChange={(type) => {
            setAdding("");
            if (!type) return;
            let made = "";
            update((s) => {
              const r = addNavItem(s, type as NavItem["type"]);
              made = r.itemId;
              return r.site;
            }, `Add ${NAV_TYPE_LABELS[type as NavItem["type"]]}`);
            setOpen(made);
          }}
        />
      </div>

      <div className="ed-side-section ed-side-rule">
        <h3>Look</h3>
      </div>
      <div className="ed-side-body">
        <div className="ed-row">
          <span className="ed-label">Style</span>
          <Select
            ariaLabel="Nav style"
            value={nav.style === "bar" ? "bar" : "pill"}
            options={[
              { value: "pill", label: "Floating pill" },
              { value: "bar", label: "Wide bar (Aerobotics)" },
            ]}
            onChange={(style) => style && update((s) => setNavBehaviour(s, { style }), "Change nav style")}
          />
        </div>
        <MediaInput label="Logo picture" kind="image" value={nav.logoImage} onChange={(logoImage) => update((s) => setNavBehaviour(s, { logoImage: logoImage || undefined }), "Change nav logo")} />
        {nav.style === "bar" ? (
          <div className="ed-row">
            <span className="ed-label">Accent colour</span>
            <TextInput ariaLabel="Accent colour" value={nav.accent ?? ""} placeholder="#0075E1" onCommit={(accent) => update((s) => setNavBehaviour(s, { accent: accent.trim() || undefined }), "Change nav accent")} />
          </div>
        ) : null}
        <button
          type="button"
          className="ed-btn ed-btn-sm"
          title="Replace the nav with the aerobotics.com bar: logo, Products menu, links, Login and Request a demo. Everything stays editable."
          onClick={() => update(applyAeroboticsNav, "Use the Aerobotics nav")}
        >
          Use the Aerobotics nav
        </button>
      </div>

      <div className="ed-side-section ed-side-rule">
        <h3>Behaviour</h3>
      </div>
      <div className="ed-side-body">
        <div className="ed-row">
          <span className="ed-label">Hide on scroll down</span>
          <div className="ed-control">
            <Toggle label="Hide on scroll down" checked={nav.hideOnScroll} onChange={(hideOnScroll) => update((s) => setNavBehaviour(s, { hideOnScroll }), "Change nav behaviour")} />
          </div>
        </div>
        <div className="ed-row">
          <span className="ed-label">Current page marker</span>
          <Select
            ariaLabel="Current page marker"
            value={nav.currentMarker}
            options={[
              { value: "pill", label: "Bone pill" },
              { value: "underline", label: "Rust underline" },
              { value: "none", label: "None" },
            ]}
            onChange={(currentMarker) => currentMarker && update((s) => setNavBehaviour(s, { currentMarker }), "Change current page marker")}
          />
        </div>
        <div className="ed-row">
          <span className="ed-label">Logo text</span>
          {/* Empty: the logo is just the symbol. */}
          <TextInput ariaLabel="Logo text" value={nav.logoText} placeholder="Empty: just the symbol" onCommit={(logoText) => update((s) => setNavBehaviour(s, { logoText: logoText.trim() }), logoText.trim() ? "Change logo text" : "Logo: just the symbol")} />
        </div>
        <div className="ed-row">
          <span className="ed-label">Sun mark in logo</span>
          <div className="ed-control">
            {/* With no logo text the symbol is the logo, so it stays on. */}
            <Toggle label="Sun mark in logo" checked={nav.showLogoMark || !nav.logoText.trim()} onChange={(showLogoMark) => (showLogoMark || nav.logoText.trim()) && update((s) => setNavBehaviour(s, { showLogoMark }), "Change logo")} />
          </div>
        </div>
        <div className="ed-row">
          <span className="ed-label">On mobile</span>
          <span className="ed-value">Full-screen menu</span>
        </div>
        <div className="ed-row">
          <span className="ed-label">Style</span>
          <span className="ed-value">Floating pill</span>
        </div>
      </div>
    </>
  );
}

function ItemCard({ item, site, first, last, open, setOpen, depth = 0 }: { item: NavItem; site: Site; first: boolean; last: boolean; open: string | null; setOpen: (id: string | null) => void; depth?: number }) {
  const { title, sub } = describe(item, site);
  const isOpen = open === item.id;
  const subPages = item.type === "page" && item.target?.kind === "page" ? site.pages.filter((p) => p.parentId === (item.target as { pageId: string }).pageId && p.showInNav) : [];
  return (
    <div className={`ed-navitem${isOpen ? " is-open" : ""}`}>
      <div className="ed-navitem-head">
        <button type="button" className="ed-navitem-title" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : item.id)}>
          <span>{title}</span>
          <small>{sub}</small>
        </button>
        <button type="button" className="ed-mini ed-mini-box" disabled={first} aria-label={`Move ${title} ${depth ? "up" : "left"}`} onClick={() => update((s) => moveNavItem(s, item.id, -1), "Reorder nav")}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M3 7.500l3-3 3 3" />
          </svg>
        </button>
        <button type="button" className="ed-mini ed-mini-box" disabled={last} aria-label={`Move ${title} ${depth ? "down" : "right"}`} onClick={() => update((s) => moveNavItem(s, item.id, 1), "Reorder nav")}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M3 4.500l3 3 3-3" />
          </svg>
        </button>
      </div>
      {subPages.length && !isOpen ? <span className="ed-navitem-note">Dropdown: {subPages.map((p) => p.title).join(", ")}</span> : null}
      {isOpen ? <ItemSettings item={item} site={site} open={open} setOpen={setOpen} depth={depth} /> : null}
    </div>
  );
}

function ItemSettings({ item, site, open, setOpen, depth }: { item: NavItem; site: Site; open: string | null; setOpen: (id: string | null) => void; depth: number }) {
  const [adding, setAdding] = useState("");
  const linkable = ["page", "section", "external", "button"].includes(item.type) || (item.type === "dropdown" && item.source !== "manual");
  const labelled = !["social", "search"].includes(item.type);
  const decorated = ["page", "section", "external", "button", "dropdown", "mega"].includes(item.type);
  const pagePlaceholder = item.target && "pageId" in item.target ? site.pages.find((p) => p.id === (item.target as { pageId: string }).pageId)?.title : undefined;

  return (
    <div className="ed-navitem-body">
      {labelled ? (
        <label className="ed-field">
          <span className="ed-field-label">Label</span>
          <TextInput value={item.label ?? ""} placeholder={pagePlaceholder ? `${pagePlaceholder} (follows the page name)` : "Label"} live onCommit={(label) => edit(item.id, { label })} />
        </label>
      ) : null}

      {item.type === "dropdown" ? (
        <div className="ed-field">
          <span className="ed-field-label">Menu items</span>
          <Segmented
            label="Dropdown source"
            value={item.source === "manual" ? "manual" : "auto"}
            options={[
              { value: "auto", label: "From sub-pages" },
              { value: "manual", label: "Pick by hand" },
            ]}
            onChange={(source) => edit(item.id, source === "auto" ? { source, target: item.target ?? { kind: "page", pageId: site.pages.find((p) => !p.isHome && !p.parentId)?.id ?? site.pages[0]!.id } } : { source, target: undefined, children: item.children ?? [] }, "Change dropdown source")}
          />
        </div>
      ) : null}

      {linkable ? (
        <div className="ed-field">
          <span className="ed-field-label">{item.type === "dropdown" ? "Sub-pages of" : "Links to"}</span>
          <LinkField
            value={item.target}
            onChange={(target) => edit(item.id, { target }, "Change nav link")}
            kinds={item.type === "page" || item.type === "dropdown" ? ["page"] : item.type === "section" ? ["section"] : item.type === "external" ? ["url", "email"] : undefined}
          />
        </div>
      ) : null}

      {item.type === "dropdown" && item.source === "manual" ? (
        <div className="ed-navitems ed-navitems-nested">
          {(item.children ?? []).map((child, i) => (
            <ItemCard key={child.id} item={child} site={site} first={i === 0} last={i === (item.children ?? []).length - 1} open={open} setOpen={setOpen} depth={depth + 1} />
          ))}
          <Select
            ariaLabel="Add to this dropdown"
            value={adding}
            options={[{ value: "", label: "+ Add to this dropdown…" }, ...MENU_CHILD_TYPES.map((t) => ({ value: t, label: NAV_TYPE_LABELS[t] }))]}
            onChange={(type) => {
              setAdding("");
              if (type) update((s) => addNavItem(s, type as NavItem["type"], item.id).site, "Add to dropdown");
            }}
          />
        </div>
      ) : null}

      {item.type === "mega" ? (
        <button type="button" className="ed-btn ed-btn-primary" onClick={() => setPage(megaPageId(item.id))}>
          Edit the menu panel on the canvas
        </button>
      ) : null}

      {item.type === "button" ? (
        <div className="ed-field">
          <span className="ed-field-label">Look</span>
          <Segmented
            label="Button look"
            value={item.variant ?? "filled"}
            options={[
              { value: "filled", label: "Filled" },
              { value: "outline", label: "Outline" },
            ]}
            onChange={(variant) => edit(item.id, { variant })}
          />
        </div>
      ) : null}

      {item.type === "embed" ? (
        <label className="ed-field">
          <span className="ed-field-label">HTML (runs sandboxed)</span>
          <textarea className="ed-input ed-code" rows={5} defaultValue={item.code ?? ""} onBlur={(e) => edit(item.id, { code: e.target.value }, "Edit nav embed")} spellCheck={false} />
        </label>
      ) : null}

      {item.type === "label" ? (
        <div className="ed-row">
          <span className="ed-label">Show as a divider line</span>
          <div className="ed-control">
            <Toggle label="Show as a divider line" checked={!!item.divider} onChange={(divider) => edit(item.id, { divider: divider || undefined })} />
          </div>
        </div>
      ) : null}

      {decorated ? (
        <>
          <div className="ed-form-two ed-form-tight">
            <label className="ed-field">
              <span className="ed-field-label">Icon</span>
              <Select
                value={item.icon?.position ?? "none"}
                options={[
                  { value: "none", label: "None" },
                  { value: "left", label: "Left" },
                  { value: "right", label: "Right" },
                ]}
                onChange={(position) => edit(item.id, { icon: !position || position === "none" ? undefined : { name: item.icon?.name ?? "arrow", position } }, "Change nav icon")}
              />
            </label>
            <label className="ed-field">
              <span className="ed-field-label">Which icon</span>
              <Select value={item.icon?.name ?? ""} options={[{ value: "", label: "—" }, ...ICON_NAMES.map((n) => ({ value: n, label: n }))]} onChange={(name) => edit(item.id, { icon: name ? { name, position: item.icon?.position && item.icon.position !== "none" ? item.icon.position : "right" } : undefined }, "Change nav icon")} />
            </label>
          </div>
          <div className="ed-form-two ed-form-tight">
            <label className="ed-field">
              <span className="ed-field-label">Description (in menus)</span>
              <TextInput value={item.description ?? ""} placeholder="A line under the label" onCommit={(description) => edit(item.id, { description: description.trim() || undefined }, "Change nav description")} />
            </label>
            <label className="ed-field">
              <span className="ed-field-label">Badge</span>
              <TextInput value={item.badge?.text ?? ""} placeholder="e.g. New" onCommit={(text) => edit(item.id, { badge: text ? { ...item.badge, text } : undefined }, "Change nav badge")} />
            </label>
            <label className="ed-field">
              <span className="ed-field-label">Badge until</span>
              <input
                className="ed-input"
                type="date"
                disabled={!item.badge}
                value={item.badge?.expires ?? ""}
                onChange={(e) => item.badge && edit(item.id, { badge: e.target.value ? { text: item.badge.text, expires: e.target.value } : { text: item.badge.text } }, "Change badge expiry")}
              />
            </label>
          </div>
        </>
      ) : null}

      <div className="ed-field">
        <span className="ed-field-label">Show on</span>
        <Segmented
          label="Show on"
          value={item.showOn}
          options={[
            { value: "both", label: "Both" },
            { value: "desktop", label: "Desktop" },
            { value: "mobile", label: "Mobile" },
          ]}
          onChange={(showOn) => edit(item.id, { showOn })}
        />
      </div>

      {decorated ? (
        <label className="ed-field">
          <span className="ed-field-label">Hover effect</span>
          <Select
            value={item.hover}
            options={[
              { value: "tint", label: "Faint bone tint" },
              { value: "underline", label: "Underline draws in" },
              { value: "none", label: "None" },
            ]}
            onChange={(hover) => hover && edit(item.id, { hover })}
          />
        </label>
      ) : null}

      {linkable && item.type !== "dropdown" ? (
        <div className="ed-row">
          <span className="ed-label">Open in new tab</span>
          <div className="ed-control">
            <Toggle label="Open in new tab" checked={!!item.newTab} onChange={(newTab) => edit(item.id, { newTab: newTab || undefined })} />
          </div>
        </div>
      ) : null}

      {labelled || item.type === "search" ? (
        <label className="ed-field">
          <span className="ed-field-label">Screen reader label (optional)</span>
          <TextInput value={item.ariaLabel ?? ""} placeholder="Defaults to the label" onCommit={(ariaLabel) => edit(item.id, { ariaLabel })} />
        </label>
      ) : null}

      <button
        type="button"
        className="ed-btn ed-btn-ghost"
        onClick={() => {
          update((s) => removeNavItem(s, item.id), "Remove nav item");
          setOpen(null);
        }}
      >
        Remove from the nav
      </button>
    </div>
  );
}
