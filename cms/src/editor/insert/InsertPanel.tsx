import { Drawer } from "@puckeditor/core";
import { getComponent } from "../../components/registry";
import { clearBlockDefault, duplicateSaved, renameSaved, savedBlocks } from "../../model/saved-blocks";
import { insertSavedBlock } from "./catalog";
import { useSavedRequest } from "./saved-open";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { insertTemplate, removeTemplate, saveTemplate, STARTER_TEMPLATES } from "../../model/library";
import { locate } from "../../model/page-ops";
import { currentPage, getState, update, useEditor } from "../store";
import { filterCatalog, insertAnchorName, insertBlock, type Chip, type Entry, type Group } from "./catalog";
import { Thumb } from "./thumbs";
import { addMark, ANNOTATION_MIME } from "../canvas/annotations";
import { addReadingOnPicture } from "../canvas/reading-anchor";

const TABS: { id: Chip; label: string; title: string }[] = [
  { id: "basics", label: "Basics", title: "Sections, text, pictures, buttons: the blocks you use all the time" },
  { id: "brand", label: "Brand", title: "Blocks made for this site, like TrueFruit by season and fruit readings" },
  { id: "motion", label: "Motion", title: "Animated blocks: Lottie animations and 3D models" },
  { id: "more", label: "More", title: "Embeds, audio, galleries, custom code and downloads" },
  { id: "saved", label: "Saved", title: "Blocks, sections and pages you saved" },
];
const GROUPS: { id: Group; label: string }[] = [
  { id: "layout", label: "Layout" },
  { id: "content", label: "Content" },
  { id: "global", label: "On every page" },
];

/** A library card: Puck makes it draggable onto the canvas; a click adds it below the selection. */
function Card({ type, label, hint }: { type: string; label: string; hint: string }) {
  const Inner = useMemo(
    () =>
      function CardInner({ children }: { children?: ReactNode; name: string }) {
        return (
          <div className="ed-card" title={`${hint}. Drag onto the page, or click to add it below the selection.`}>
            <Thumb type={type} />
            <span className="ed-card-name">{label}</span>
            <span hidden>{children}</span>
          </div>
        );
      },
    [type, label, hint],
  );
  // A press that turned into a drag is not a click.
  const down = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      className="ed-card-wrap"
      data-insert-type={type}
      onPointerDownCapture={(e) => (down.current = { x: e.clientX, y: e.clientY })}
      onClick={(e) => {
        const d = down.current;
        if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) return;
        insertBlock(type);
      }}
      role="button"
      tabIndex={0}
      aria-label={`Add ${label}`}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), insertBlock(type))}
    >
      <Drawer.Item name={type} label={label}>
        {Inner}
      </Drawer.Item>
    </div>
  );
}

/**
 * The block library (Insert flyout): search, category chips and a two-column
 * grid of cards with mini previews. Drag a card onto the canvas, or click it to
 * add it below the selected block (at the end of the page if nothing is selected).
 */
export function InsertPanel() {
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<Chip>("basics");
  // "Save as a block" (settings panel …) opens this tab.
  const savedReq = useSavedRequest();
  useEffect(() => {
    if (savedReq) (setChip("saved"), setQuery(""));
  }, [savedReq]);
  const [annHint, setAnnHint] = useState(false);
  const page = useEditor(currentPage);
  const selected = useEditor((s) => s.selection[0]);
  const below = insertAnchorName(page, selected);
  const searching = !!query.trim();
  const entries = chip === "saved" && !searching ? [] : filterCatalog(query, chip);
  const cards = (list: Entry[]) => (
    <div className="ed-cards">
      {list.map((e) => (
        <Card key={e.type} type={e.type} label={e.label} hint={e.hint} />
      ))}
    </div>
  );
  const showReading = (searching && "fruit reading annotation".includes(query.trim().toLowerCase())) || (!searching && chip === "brand");
  return (
    <div className="ed-library-panel">
      <div className="ed-library-top">
        <input className="ed-input ed-search" type="search" placeholder="Search all blocks" aria-label="Search blocks" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="ed-ins-tabs" role="tablist" aria-label="Block categories">
          {TABS.map((c) => (
            <button key={c.id} type="button" role="tab" title={c.title} aria-selected={!searching && chip === c.id} onClick={() => (setChip(c.id), setQuery(""))}>
              {c.label}
            </button>
          ))}
        </div>
        <p className="ed-hint">{below ? `Click adds below ${below}. Or drag onto the page.` : "Click adds at the end of the page. Or drag onto the page."}</p>
      </div>
      {chip === "saved" && !searching ? (
        <SavedGrid query={query} />
      ) : (
        <Drawer>
          {chip === "basics" && !searching
            ? GROUPS.map((g) => {
                const list = entries.filter((e) => e.group === g.id);
                return list.length ? (
                  <div key={g.id} className="ed-ins-group">
                    <p className="ed-ins-group-label">{g.label}</p>
                    {cards(list)}
                  </div>
                ) : null;
              })
            : cards(entries)}
          {!entries.length && !showReading ? <p className="ed-empty">No blocks match "{query}".</p> : null}
        </Drawer>
      )}
      {!showReading ? null : (
        <div className="ed-overlay-cards">
          <p className="ed-hint">On a picture</p>
          <div
            className="ed-card ed-card-overlay"
            draggable
            role="button"
            tabIndex={0}
            title="Drag onto a picture to mark a fruit with its size and colour, or click to add one to the selected picture."
            onDragStart={(e) => {
              e.dataTransfer.setData(ANNOTATION_MIME, "1");
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => {
              const id = getState().selection[0];
              setAnnHint(!id || !(addReadingOnPicture(id) || addMark(id)));
            }}
          >
            <span className="ed-card-thumb-ann" aria-hidden="true">
              <svg viewBox="0 0 100 64" width="100%" height="100%">
                <rect x="6" y="6" width="88" height="52" rx="6" fill="#26412a" />
                <circle cx="38" cy="38" r="12" fill="none" stroke="#fff" strokeWidth="2.5" />
                <rect x="52" y="12" width="34" height="18" rx="4" fill="rgba(255,255,255,.3)" stroke="#fff" strokeWidth="1" />
              </svg>
            </span>
            <span className="ed-card-name">Fruit reading</span>
          </div>
          {annHint ? <p className="ed-hint">Select a picture first, or drag the reading onto one.</p> : null}
        </div>
      )}
    </div>
  );
}

/**
 * Your saved blocks: a click adds one below the selection. "…" on a card renames, duplicates or
 * deletes it. A block just saved (settings panel → … → Save as a block) opens ready to rename.
 */
function SavedBlocks({ query }: { query: string }) {
  const site = useEditor((s) => s.site);
  const req = useSavedRequest();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  useEffect(() => {
    if (req && Date.now() - req.at < 3000) setRenaming(req.id);
  }, [req]);
  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => !(e.target as Element).closest?.(".ed-saved-menu") && setMenu(null);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [menu]);
  const q = query.trim().toLowerCase();
  const blocks = savedBlocks(site).filter((t) => !q || t.name.toLowerCase().includes(q));
  const defaults = site.templates.filter((t) => t.kind === "default");
  return (
    <div className="ed-ins-group">
      <p className="ed-ins-group-label">Your blocks</p>
      {blocks.length ? (
        <div className="ed-cards">
          {blocks.map((t) => (
            <div key={t.id} className="ed-card-wrap">
              {renaming === t.id ? (
                <form
                  className="ed-card ed-card-rename"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = (new FormData(e.currentTarget).get("name") as string) ?? "";
                    update((s) => renameSaved(s, t.id, v), "Rename saved block");
                    setRenaming(null);
                  }}
                >
                  <Thumb type={t.sections[0]?.children[0]?.type} />
                  <input name="name" className="ed-input" aria-label="Name of the saved block" defaultValue={t.name} autoFocus onFocus={(e) => e.currentTarget.select()} onBlur={(e) => e.currentTarget.form?.requestSubmit()} onKeyDown={(e) => e.key === "Escape" && setRenaming(null)} />
                </form>
              ) : (
                <button type="button" className="ed-card" onClick={() => insertSavedBlock(t.id, t.name)} title={`${t.name}: click to add it to this page`}>
                  <Thumb type={t.sections[0]?.children[0]?.type} />
                  <span className="ed-card-name">{t.name}</span>
                </button>
              )}
              <div className="ed-saved-menu">
                <button type="button" className="ed-card-x ed-card-more" aria-label={`More for ${t.name}`} aria-haspopup="menu" aria-expanded={menu === t.id} onClick={() => setMenu(menu === t.id ? null : t.id)}>
                  …
                </button>
                {menu === t.id ? (
                  <ul className="bd-menu" role="menu" aria-label={t.name}>
                    <li role="none">
                      <button type="button" role="menuitem" onClick={() => (setMenu(null), setRenaming(t.id))}>
                        Rename
                      </button>
                    </li>
                    <li role="none">
                      <button type="button" role="menuitem" onClick={() => {
                        setMenu(null);
                        let id = "";
                        update((s) => {
                          const r = duplicateSaved(s, t.id);
                          id = r.id;
                          return r.site;
                        }, `Duplicate ${t.name}`);
                        setRenaming(id);
                      }}>
                        Duplicate
                      </button>
                    </li>
                    <li role="none">
                      <button type="button" role="menuitem" onClick={() => (setMenu(null), update((s) => removeTemplate(s, t.id), `Delete saved block ${t.name}`))}>
                        Delete
                      </button>
                    </li>
                  </ul>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="ed-empty">{q ? `No saved blocks match "${query}".` : "None yet. Select a block, then … in its settings → Save as a block."}</p>
      )}
      {defaults.length && !q ? (
        <div className="ed-saved-defaults">
          <p className="ed-ins-group-label">New blocks start like yours</p>
          {defaults.map((t) => {
            const label = (getComponent(t.name)?.label ?? t.name).split(":")[0];
            return (
              <div key={t.id} className="ed-saved-default">
                <span>{label}</span>
                <button type="button" className="ed-btn ed-btn-sm ed-btn-ghost" onClick={() => update((s) => clearBlockDefault(s, t.name), `${label}: back to the built-in start`)} title="New ones start from the block's built-in pictures and words again">
                  Use built-in
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** Saved templates as cards. A click adds the template's sections below the selection. */
function SavedGrid({ query }: { query: string }) {
  const templates = useEditor((s) => s.site.templates).filter((t) => t.kind === "section" || t.kind === "page");
  const page = useEditor(currentPage);
  const selectedId = useEditor((s) => s.selection[0]);
  const at = selectedId ? locate(page, selectedId) : null;
  const selectedSection = at ? (at.kind === "section" ? at.section : at.kind === "node" ? at.section : null) : null;
  const shown = templates.filter((t) => !query.trim() || t.name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <>
      <SavedBlocks query={query} />
      <p className="ed-ins-group-label">Sections and pages</p>
      <div className="ed-cards">
        {shown.map((t) => (
          <div key={t.id} className="ed-card-wrap">
            <button type="button" className="ed-card" onClick={() => update((s) => insertTemplate(s, getState().pageId, t.id), `Insert template ${t.name}`)} title={`${t.kind === "page" ? "Page" : "Section"} template · ${t.sections.length} ${t.sections.length === 1 ? "section" : "sections"}. Click to add it to this page.`}>
              <Thumb saved />
              <span className="ed-card-name">{t.name}</span>
            </button>
            {STARTER_TEMPLATES.includes(t.id) ? null : (
              <button type="button" className="ed-card-x" aria-label={`Delete template ${t.name}`} onClick={() => update((s) => removeTemplate(s, t.id), `Delete template ${t.name}`)}>
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {!shown.length ? <p className="ed-empty">No saved templates{query ? ` match "${query}"` : " yet"}.</p> : null}
      <div className="ed-panel-foot">
        <button type="button" className="ed-btn ed-btn-ghost" disabled={!selectedSection} onClick={() => selectedSection && update((s) => saveTemplate(s, "section", selectedSection.name ?? "Section", [selectedSection]).site, "Save section as template")}>
          Save the selected section
        </button>
        <button type="button" className="ed-btn ed-btn-ghost" onClick={() => update((s) => saveTemplate(s, "page", page.title, currentPage(getState()).sections).site, "Save page as template")}>
          Save this page as a template
        </button>
      </div>
    </>
  );
}
