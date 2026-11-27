import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FIELD_TYPES, itemAddress, slugify, TITLE } from "../../model/cms";
import type { CmsCollection, CmsField, CmsFieldType, CmsItem, CmsValue } from "../../schema";
import { demoPath } from "../demo";
import { pickMedia } from "../fields/media";
import { flush, useEditor } from "../store";
import { Modal } from "../ui/kit";
import * as act from "./actions";
import { closeCollections, openCollections, useCollectionsOpen } from "./collections-open";
import { EXAMPLES } from "./examples";
import "./collections.css";

/**
 * Collections (EDITOR-COLLECTIONS.md): a full-screen table view, like Framer's CMS. Collections on
 * the left; the table of entries on the right (title, address, live or draft, a column per field),
 * edited in place; an entry opens in a form beside a live preview of its page.
 */
export function CollectionsView() {
  const open = useCollectionsOpen();
  const collections = useEditor((s) => s.site.cms);
  const active = collections.find((c) => c.id === open?.collectionId) ?? collections[0] ?? null;
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector(".ed-backdrop")) return;
      if (open?.itemId) openCollections(open.collectionId, null);
      else closeCollections();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open?.itemId, open?.collectionId]);

  return (
    <div className="ed-cms" role="dialog" aria-modal="true" aria-label="Collections">
      <header className="ed-cms-head">
        <strong>Collections</strong>
        <span className="ed-cms-sub">Entries, each its own page made from the collection's page design.</span>
        <span className="ed-cms-spacer" />
        <button type="button" className="ed-btn ed-btn-ghost" onClick={closeCollections} title="Back to the canvas (Esc)">
          Back to the canvas
        </button>
      </header>
      <div className="ed-cms-body">
        <nav className="ed-cms-side" aria-label="Collections">
          <ul>
            {collections.map((c) => (
              <li key={c.id}>
                <button type="button" className={c.id === active?.id ? "is-on" : ""} onClick={() => openCollections(c.id, null)}>
                  <span>{c.name}</span>
                  <small>{c.items.length}</small>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="ed-cms-new" onClick={() => setAdding(true)}>
            + New collection
          </button>
        </nav>
        <main className="ed-cms-main">{active ? <Table col={active} itemId={open?.itemId ?? null} /> : <Empty onBlank={() => setAdding(true)} />}</main>
      </div>
      {adding ? <NewCollection onClose={() => setAdding(false)} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------- empty state and new collection

function Empty({ onBlank }: { onBlank: () => void }) {
  return (
    <div className="ed-cms-empty">
      <h2>No collections yet</h2>
      <p>A collection is a list of entries, like success stories or events. Each live entry becomes its own page, made from one page design you build on the canvas.</p>
      <div className="ed-cms-starts">
        {EXAMPLES.map((e) => (
          <button key={e.id} type="button" className="ed-cms-start" onClick={() => openCollections(act.newExample(e.id), null)}>
            <strong>Start with {e.name}</strong>
            <small>{e.hint}</small>
          </button>
        ))}
        <button type="button" className="ed-cms-start" onClick={onBlank}>
          <strong>Blank collection</strong>
          <small>Name it, then add the fields you need</small>
        </button>
      </div>
    </div>
  );
}

function NewCollection({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [itemName, setItemName] = useState("");
  const make = () => {
    if (!name.trim()) return;
    openCollections(act.newCollection(name, itemName || name.replace(/s$/i, "")), null);
    onClose();
  };
  return (
    <Modal title="New collection" onClose={onClose}>
      <div className="ed-cms-form">
        <label>
          <span>Name (plural)</span>
          <input className="ed-input" autoFocus value={name} placeholder="Case studies" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && make()} />
        </label>
        <label>
          <span>One entry is called</span>
          <input className="ed-input" value={itemName} placeholder={name ? name.replace(/s$/i, "") : "Case study"} onChange={(e) => setItemName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && make()} />
        </label>
        <p className="ed-cms-note">Entries will live at /{slugify(name || "case-studies")}/…</p>
        <div className="ed-cms-actions">
          <span className="ed-cms-spacer" />
          {EXAMPLES.map((e) => (
            <button key={e.id} type="button" className="ed-btn ed-btn-ghost" onClick={() => (openCollections(act.newExample(e.id), null), onClose())}>
              Use the {e.name} example
            </button>
          ))}
          <button type="button" className="ed-btn ed-btn-primary" disabled={!name.trim()} onClick={make}>
            Create
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- the table

type SortKey = typeof TITLE | "slug" | "status" | "updatedAt" | string;
const valueText = (v: CmsValue | undefined) => (v === undefined ? "" : typeof v === "boolean" ? (v ? "1" : "0") : String(v));

function Table({ col, itemId }: { col: CmsCollection; itemId: string | null }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "live" | "draft">("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState(false);
  useEffect(() => setPicked(new Set()), [col.id]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = col.items.filter((i) => (status === "all" || i.status === status) && (!q || [i.title, i.slug, ...Object.values(i.values).map(valueText)].join(" ").toLowerCase().includes(q)));
    if (sort) {
      const get = (i: CmsItem) => (sort.key === TITLE ? i.title : sort.key === "slug" ? i.slug : sort.key === "status" ? i.status : sort.key === "updatedAt" ? (i.updatedAt ?? "") : valueText(i.values[sort.key]));
      list = [...list].sort((a, b) => get(a).localeCompare(get(b), undefined, { numeric: true }) * sort.dir);
    }
    return list;
  }, [col.items, query, status, sort]);

  const sortBy = (key: SortKey) => setSort((s) => (s?.key === key ? (s.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 }));
  const head = (key: SortKey, label: string, cls = "") => (
    <th className={cls} aria-sort={sort?.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => sortBy(key)} title="Sort">
        {label}
        {sort?.key === key ? <span aria-hidden="true">{sort.dir === 1 ? " ↑" : " ↓"}</span> : null}
      </button>
    </th>
  );
  const ids = [...picked].filter((id) => col.items.some((i) => i.id === id));
  const all = rows.length > 0 && rows.every((r) => picked.has(r.id));
  const toggle = (id: string) => setPicked((p) => (p.has(id) ? new Set([...p].filter((x) => x !== id)) : new Set([...p, id])));
  const openItem = (id: string | null) => openCollections(col.id, id);
  const live = col.items.filter((i) => i.status === "live").length;

  return (
    <div className={`ed-cms-pane${itemId ? " has-item" : ""}`}>
      <div className="ed-cms-tablewrap">
        <div className="ed-cms-bar">
          <div className="ed-cms-title">
            <h2>{col.name}</h2>
            <small>
              {col.items.length} {col.items.length === 1 ? col.itemName.toLowerCase() : "entries"} · {live} live · {col.base}/…
            </small>
          </div>
          <span className="ed-cms-spacer" />
          <input className="ed-input ed-cms-search" type="search" placeholder="Search" aria-label="Search entries" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="ed-cms-seg" role="group" aria-label="Show">
            {(["all", "live", "draft"] as const).map((s) => (
              <button key={s} type="button" className={status === s ? "is-on" : ""} aria-pressed={status === s} onClick={() => setStatus(s)}>
                {s === "all" ? "All" : s === "live" ? "Live" : "Drafts"}
              </button>
            ))}
          </div>
          <button type="button" className="ed-btn ed-btn-ghost" onClick={() => setSheet(true)}>
            Fields &amp; settings
          </button>
          <button type="button" className="ed-btn ed-btn-ghost" onClick={() => (act.openDesign(col.id), closeCollections())} title="Edit the page every entry is made from, on the canvas">
            Page design
          </button>
          <button type="button" className="ed-btn ed-btn-primary" onClick={() => openItem(act.newItem(col.id))}>
            + New {col.itemName.toLowerCase()}
          </button>
        </div>

        {ids.length ? (
          <div className="ed-cms-bulk" role="toolbar" aria-label="Selected entries">
            <span>{ids.length} selected</span>
            <button type="button" className="ed-btn ed-btn-ghost" onClick={() => act.setStatus(col.id, ids, "live")}>
              Set live
            </button>
            <button type="button" className="ed-btn ed-btn-ghost" onClick={() => act.setStatus(col.id, ids, "draft")}>
              Set to draft
            </button>
            <button type="button" className="ed-btn ed-btn-danger" onClick={() => window.confirm(`Delete ${ids.length} ${ids.length === 1 ? "entry" : "entries"}? (Undo with ⌘Z.)`) && (act.removeItems(col.id, ids), setPicked(new Set()))}>
              Delete
            </button>
            <button type="button" className="ed-btn ed-btn-ghost" onClick={() => setPicked(new Set())}>
              Clear
            </button>
          </div>
        ) : null}

        <div className="ed-cms-scroll">
          <table className="ed-cms-table">
            <thead>
              <tr>
                <th className="ed-cms-check">
                  <input type="checkbox" aria-label="Select all shown" checked={all} onChange={() => setPicked(all ? new Set() : new Set(rows.map((r) => r.id)))} />
                </th>
                {head(TITLE, "Title", "ed-cms-col-title")}
                {head("slug", "Address", "ed-cms-col-slug")}
                {head("status", "Status")}
                {col.fields.map((f) => head(f.id, f.name, `ed-cms-col-${f.type}`))}
                {head("updatedAt", "Updated")}
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className={`${i.id === itemId ? "is-open" : ""}${picked.has(i.id) ? " is-picked" : ""}`}>
                  <td className="ed-cms-check">
                    <input type="checkbox" aria-label={`Select ${i.title}`} checked={picked.has(i.id)} onChange={() => toggle(i.id)} />
                  </td>
                  <td className="ed-cms-col-title">
                    <CellText value={i.title} label="Title" onCommit={(v) => act.editItem(col.id, i.id, { title: v }, "title")} />
                  </td>
                  <td className="ed-cms-col-slug">
                    <CellText value={i.slug} label="Address" prefix={`${col.base}/`} onCommit={(v) => act.editItem(col.id, i.id, { slug: v }, "address")} />
                  </td>
                  <td>
                    <StatusPill status={i.status} onToggle={() => act.setStatus(col.id, [i.id], i.status === "live" ? "draft" : "live")} />
                  </td>
                  {col.fields.map((f) => (
                    <td key={f.id} className={`ed-cms-col-${f.type}`}>
                      <Cell field={f} value={i.values[f.id]} onCommit={(v) => act.editItem(col.id, i.id, { values: { [f.id]: v } }, f.name)} />
                    </td>
                  ))}
                  <td className="ed-cms-updated">{i.updatedAt ? when(i.updatedAt) : ""}</td>
                  <td className="ed-cms-rowacts">
                    <button type="button" className="ed-btn ed-btn-ghost ed-btn-sm" onClick={() => openItem(i.id)}>
                      Open
                    </button>
                    <RowMenu col={col} item={i} onOpen={openItem} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? (
            <p className="ed-cms-none">
              {col.items.length ? "Nothing matches." : `No ${col.name.toLowerCase()} yet.`}{" "}
              <button type="button" className="ed-link" onClick={() => openItem(act.newItem(col.id))}>
                Add the first one
              </button>
            </p>
          ) : null}
        </div>
      </div>
      {itemId ? <ItemPanel col={col} itemId={itemId} onClose={() => openItem(null)} /> : null}
      {sheet ? <FieldsSheet col={col} onClose={() => setSheet(false)} /> : null}
    </div>
  );
}

const when = (iso: string) => {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

function StatusPill({ status, onToggle }: { status: CmsItem["status"]; onToggle: () => void }) {
  return (
    <button type="button" className={`ed-cms-pill is-${status}`} onClick={onToggle} title={status === "live" ? "Live once published. Click to make it a draft." : "Draft: not on the site. Click to set it live."}>
      {status === "live" ? "Live" : "Draft"}
    </button>
  );
}

function RowMenu({ col, item, onOpen }: { col: CmsCollection; item: CmsItem; onOpen: (id: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const idx = col.items.findIndex((i) => i.id === item.id);
  const run = (fn: () => void) => () => (setOpen(false), fn());
  return (
    <div className="ed-cms-menuwrap" ref={box}>
      <button type="button" className="ed-btn ed-btn-ghost ed-btn-sm" aria-label={`More for ${item.title}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        ⋯
      </button>
      {open ? (
        <ul className="ed-menu ed-cms-menu" role="menu">
          <li role="none">
            <button type="button" role="menuitem" onClick={run(() => window.open(demoPath(`/preview${itemAddress(col, item)}`), "_blank", "noopener"))}>
              Preview page
            </button>
          </li>
          <li role="none">
            <button type="button" role="menuitem" onClick={run(() => onOpen(act.duplicate(col.id, item.id)))}>
              Duplicate
            </button>
          </li>
          <li role="none">
            <button type="button" role="menuitem" disabled={idx <= 0} onClick={run(() => act.moveItem(col.id, item.id, -1))}>
              Move up
            </button>
          </li>
          <li role="none">
            <button type="button" role="menuitem" disabled={idx >= col.items.length - 1} onClick={run(() => act.moveItem(col.id, item.id, 1))}>
              Move down
            </button>
          </li>
          <li role="none">
            <button type="button" role="menuitem" className="is-danger" onClick={run(() => window.confirm(`Delete "${item.title}"? (Undo with ⌘Z.)`) && act.removeItems(col.id, [item.id]))}>
              Delete
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- cells

/** A text cell: edits locally, saves on Enter or when leaving it (Esc puts it back). */
function CellText({ value, onCommit, label, prefix, multiline }: { value: string; onCommit: (v: string) => void; label: string; prefix?: string; multiline?: boolean }) {
  const [draft, setDraft] = useState(value);
  const editing = useRef(false);
  useEffect(() => {
    if (!editing.current) setDraft(value);
  }, [value]);
  const commit = () => {
    editing.current = false;
    if (draft !== value) onCommit(draft);
  };
  const props = {
    className: "ed-cms-cell",
    "aria-label": label,
    value: draft,
    title: draft,
    onFocus: () => (editing.current = true),
    onChange: (e: { target: { value: string } }) => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setDraft(value);
        editing.current = false;
        (e.target as HTMLElement).blur();
      }
      if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) (e.target as HTMLElement).blur();
    },
  };
  return (
    <span className={`ed-cms-cellwrap${prefix ? " has-prefix" : ""}`}>
      {prefix ? <span className="ed-cms-prefix">{prefix}</span> : null}
      {multiline ? <textarea rows={1} {...props} /> : <input {...props} />}
    </span>
  );
}

/** A table cell for one field, by its type. */
function Cell({ field, value, onCommit }: { field: CmsField; value: CmsValue | undefined; onCommit: (v: CmsValue) => void }) {
  switch (field.type) {
    case "toggle":
      return <input type="checkbox" className="ed-cms-toggle" aria-label={field.name} checked={value === true} onChange={(e) => onCommit(e.target.checked)} />;
    case "choice":
      return (
        <select className="ed-cms-cell" aria-label={field.name} value={String(value ?? "")} onChange={(e) => onCommit(e.target.value)}>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case "date":
      return <input type="date" className="ed-cms-cell" aria-label={field.name} value={String(value ?? "")} onChange={(e) => onCommit(e.target.value)} />;
    case "number":
      return <CellText value={String(value ?? 0)} label={field.name} onCommit={(v) => onCommit(Number(v))} />;
    case "image":
      return <PictureCell value={String(value ?? "")} label={field.name} onCommit={onCommit} />;
    case "longtext":
      return <CellText value={String(value ?? "")} label={field.name} onCommit={onCommit} multiline />;
    default:
      return <CellText value={String(value ?? "")} label={field.name} onCommit={onCommit} />;
  }
}

const thumb = (src: string) => (src.startsWith("/art/") && /\.(webp|jpe?g|png)$/i.test(src) && !/\.\d+\.webp$/.test(src) ? src.replace(/\.[a-z]+$/i, ".480.webp") : src.startsWith("/media/") ? `${src}?w=480` : src);

function PictureCell({ value, label, onCommit, large }: { value: string; label: string; onCommit: (v: string) => void; large?: boolean }) {
  const choose = async () => {
    const url = await pickMedia("image");
    if (url) onCommit(url);
  };
  return (
    <span className={`ed-cms-pic${large ? " is-large" : ""}`}>
      <button type="button" className="ed-cms-picbtn" onClick={choose} aria-label={value ? `Change ${label}` : `Choose ${label}`} title={value ? value.split("/").pop() : "Choose a picture"}>
        {value ? <img src={thumb(value)} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).src = value)} /> : <span>+</span>}
      </button>
      {value && large ? (
        <button type="button" className="ed-link" onClick={() => onCommit("")}>
          Remove
        </button>
      ) : null}
    </span>
  );
}

// ---------------------------------------------------------------- the entry panel

function ItemPanel({ col, itemId, onClose }: { col: CmsCollection; itemId: string; onClose: () => void }) {
  const item = col.items.find((i) => i.id === itemId);
  const address = item ? itemAddress(col, item) : "";
  const [frameKey, setFrameKey] = useState(0);
  const stamp = item ? JSON.stringify(item) : "";
  // The preview is the real page from the draft: save first, then reload it.
  useEffect(() => {
    if (!item) return;
    const t = setTimeout(() => void flush().then(() => setFrameKey((k) => k + 1)), 700);
    return () => clearTimeout(t);
  }, [stamp]);
  if (!item) return null;
  const set = (patch: Parameters<typeof act.editItem>[2], what: string) => act.editItem(col.id, item.id, patch, what);
  const src = demoPath(`/preview${address}`);
  return (
    <aside className="ed-cms-item" aria-label={`${col.itemName}: ${item.title}`}>
      <header className="ed-cms-itemhead">
        <StatusPill status={item.status} onToggle={() => act.setStatus(col.id, [item.id], item.status === "live" ? "draft" : "live")} />
        <strong>{item.title || `Untitled ${col.itemName.toLowerCase()}`}</strong>
        <span className="ed-cms-spacer" />
        <a className="ed-btn ed-btn-ghost ed-btn-sm" href={src} target="_blank" rel="noopener">
          Open preview
        </a>
        <button type="button" className="ed-icon" aria-label="Close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </header>
      <div className="ed-cms-itembody">
        <div className="ed-cms-fields">
          <Field label="Title">
            <CellText value={item.title} label="Title" onCommit={(v) => set({ title: v }, "title")} />
          </Field>
          <Field label="Address" help={`The page is at ${address}. Changing it changes the link.`}>
            <CellText value={item.slug} label="Address" prefix={`${col.base}/`} onCommit={(v) => set({ slug: v }, "address")} />
          </Field>
          {col.fields.map((f) => (
            <Field key={f.id} label={f.name} help={f.help}>
              {f.type === "longtext" ? (
                <LongText value={String(item.values[f.id] ?? "")} label={f.name} onCommit={(v) => set({ values: { [f.id]: v } }, f.name)} />
              ) : f.type === "image" ? (
                <PictureCell large value={String(item.values[f.id] ?? "")} label={f.name} onCommit={(v) => set({ values: { [f.id]: v } }, f.name)} />
              ) : (
                <Cell field={f} value={item.values[f.id]} onCommit={(v) => set({ values: { [f.id]: v } }, f.name)} />
              )}
            </Field>
          ))}
          {!col.fields.length ? <p className="ed-cms-note">This collection has no fields yet: add some under Fields &amp; settings.</p> : null}
        </div>
        <figure className="ed-cms-preview">
          <figcaption>
            Preview of {address}
            {item.status === "draft" ? " (draft: only people signed in can see it)" : ""}
          </figcaption>
          {col.pageId ? <iframe key={frameKey} src={src} title={`Preview of ${item.title}`} /> : <p className="ed-cms-note">No page design yet. Use Page design to make one.</p>}
        </figure>
      </div>
    </aside>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <div className="ed-cms-field">
      <span className="ed-cms-label">{label}</span>
      {children}
      {help ? <small>{help}</small> : null}
    </div>
  );
}

function LongText({ value, label, onCommit }: { value: string; label: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);
  return (
    <textarea
      className="ed-input ed-cms-long"
      aria-label={label}
      rows={5}
      value={draft}
      onFocus={() => (focused.current = true)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        focused.current = false;
        if (draft !== value) onCommit(draft);
      }}
    />
  );
}

// ---------------------------------------------------------------- fields and settings

function FieldsSheet({ col, onClose }: { col: CmsCollection; onClose: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<CmsFieldType>("text");
  const [base, setBase] = useState(col.base.slice(1));
  useEffect(() => setBase(col.base.slice(1)), [col.base]);
  const add = () => {
    if (!name.trim()) return;
    act.addField(col.id, name, type);
    setName("");
  };
  const texts = col.fields.filter((f) => f.type === "text" || f.type === "longtext");
  const pictures = col.fields.filter((f) => f.type === "image");
  return (
    <Modal title={`${col.name}: fields & settings`} onClose={onClose} wide>
      <div className="ed-cms-sheet">
        <section>
          <h4>Fields</h4>
          <p className="ed-cms-note">Every entry has a title and an address. Add the other things each entry needs; each field becomes a column and can be connected to blocks on the page design.</p>
          <ul className="ed-cms-fieldlist">
            {col.fields.map((f, i) => (
              <li key={f.id}>
                <input className="ed-input" aria-label="Field name" defaultValue={f.name} onBlur={(e) => e.target.value.trim() && e.target.value !== f.name && act.editField(col.id, f.id, { name: e.target.value.trim() })} />
                <select className="ed-input" aria-label="Field type" value={f.type} onChange={(e) => confirmRetype(f, e.target.value as CmsFieldType) && act.editField(col.id, f.id, { type: e.target.value as CmsFieldType })}>
                  {FIELD_TYPES.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {f.type === "choice" ? (
                  <input
                    className="ed-input ed-cms-options"
                    aria-label="Options, comma separated"
                    defaultValue={(f.options ?? []).join(", ")}
                    title="Options, comma separated"
                    onBlur={(e) => {
                      const options = e.target.value.split(",").map((o) => o.trim()).filter(Boolean);
                      if (options.join("|") !== (f.options ?? []).join("|")) act.editField(col.id, f.id, { options });
                    }}
                  />
                ) : (
                  <span />
                )}
                <button type="button" className="ed-btn ed-btn-ghost ed-btn-sm" aria-label={`Move ${f.name} up`} disabled={i === 0} onClick={() => act.moveField(col.id, f.id, -1)}>
                  ↑
                </button>
                <button type="button" className="ed-btn ed-btn-ghost ed-btn-sm" aria-label={`Move ${f.name} down`} disabled={i === col.fields.length - 1} onClick={() => act.moveField(col.id, f.id, 1)}>
                  ↓
                </button>
                <button type="button" className="ed-btn ed-btn-ghost ed-btn-sm" aria-label={`Remove ${f.name}`} onClick={() => window.confirm(`Remove "${f.name}"? Its values in every entry and its connections on the page design go too. (Undo with ⌘Z.)`) && act.removeField(col.id, f.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="ed-cms-addfield">
            <input className="ed-input" placeholder="New field name" aria-label="New field name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
            <select className="ed-input" aria-label="New field type" value={type} onChange={(e) => setType(e.target.value as CmsFieldType)}>
              {FIELD_TYPES.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
            <button type="button" className="ed-btn ed-btn-primary" disabled={!name.trim()} onClick={add}>
              Add field
            </button>
          </div>
        </section>
        <section>
          <h4>Collection</h4>
          <div className="ed-cms-form">
            <label>
              <span>Name</span>
              <input className="ed-input" defaultValue={col.name} onBlur={(e) => e.target.value.trim() && act.editCollection(col.id, { name: e.target.value.trim() })} />
            </label>
            <label>
              <span>One entry is called</span>
              <input className="ed-input" defaultValue={col.itemName} onBlur={(e) => e.target.value.trim() && act.editCollection(col.id, { itemName: e.target.value.trim() })} />
            </label>
            <label>
              <span>Address</span>
              <span className="ed-cms-baserow">
                <span>/</span>
                <input className="ed-input" value={base} onChange={(e) => setBase(e.target.value)} onBlur={() => act.moveCollection(col.id, base)} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLElement).blur()} />
                <span>/…</span>
              </span>
            </label>
            <label>
              <span>Summary for lists comes from</span>
              <select className="ed-input" value={col.summaryField ?? ""} onChange={(e) => act.editCollection(col.id, { summaryField: e.target.value || undefined })}>
                <option value="">The first long text field</option>
                {texts.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Picture for lists and link previews comes from</span>
              <select className="ed-input" value={col.imageField ?? ""} onChange={(e) => act.editCollection(col.id, { imageField: e.target.value || undefined })}>
                <option value="">The first picture field</option>
                {pictures.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="ed-cms-actions">
            <button type="button" className="ed-btn ed-btn-danger" onClick={() => window.confirm(`Delete the ${col.name} collection, its ${col.items.length} entries and its page design? (Undo with ⌘Z.)`) && (act.removeCollection(col.id), onClose(), openCollections(null, null))}>
              Delete collection
            </button>
            <span className="ed-cms-spacer" />
            <button type="button" className="ed-btn ed-btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
}

const confirmRetype = (f: CmsField, to: CmsFieldType) => f.type === to || window.confirm(`Change "${f.name}" to ${FIELD_TYPES.find((t) => t.type === to)?.label}? Values that don't fit become empty. (Undo with ⌘Z.)`);

