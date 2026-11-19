import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { selectBlock } from "../board/bridge";
import { placeMedia, replaceImage } from "../canvas/drops";
import { CATALOG, insertAnchorName, insertBlock } from "../insert/catalog";
import { listMedia, type MediaItem } from "../media";
import { askClaude } from "../socket";
import { currentPage, getState, setPage, useEditor } from "../store";
import { looksLikeSentence, rank } from "./fuzzy";
import { pageBlocks } from "./items";
import { closePalette, noteAsked, usePalette } from "./palette-store";
import { canRun, runAction } from "./run";
import { ACTIONS, type ActionId } from "./registry";
import { keyLabels, shortcutFor } from "./shortcuts";
import "./palette.css";

type Kind = "claude" | "connect" | "page" | "block" | "insert" | "media" | "action";
type Row = { key: string; kind: Kind; title: string; sub?: string; keys?: string[]; run: () => void };

const CHIP: Record<Kind, string> = { claude: "Claude", connect: "Claude", page: "Page", block: "Block", insert: "Add", media: "Media", action: "Action" };

const keysOf = (id: ActionId) => {
  const s = shortcutFor(id);
  return s ? keyLabels(s) : undefined;
};

const actionRow = (id: ActionId, title: string): Row => ({ key: `action:${id}`, kind: "action", title, keys: keysOf(id), run: () => runAction(id) });

/** The selected block's element in the editable frame (media goes in below it). */
const selectedEl = () => {
  const id = getState().selection[0];
  return id ? (document.querySelector<HTMLIFrameElement>("#preview-frame")?.contentDocument?.querySelector(`[data-node-id="${CSS.escape(id)}"], [data-section-id="${CSS.escape(id)}"]`) ?? null) : null;
};

/**
 * The command palette (⌘K): a frosted, centred list. Empty, it shows Recent
 * (pages and blocks) and common Actions. Typing searches pages, blocks on the
 * page, blocks to add, media and every action. A query that reads like a
 * sentence offers "Ask Claude to do this" (⌘↵) on top.
 */
export function Palette() {
  const open = usePalette((s) => s.palette);
  return open ? <PaletteDialog /> : null;
}

function PaletteDialog() {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const site = useEditor((s) => s.site);
  const page = useEditor(currentPage);
  const pageId = useEditor((s) => s.pageId);
  const selection = useEditor((s) => s.selection[0]);
  const recent = usePalette((s) => s.recent);

  useEffect(() => {
    let stop = false;
    listMedia()
      .then((m) => !stop && setMedia(m))
      .catch(() => undefined);
    api
      .claude()
      .then((r) => !stop && setConnected(r.connected))
      .catch(() => !stop && setConnected(false));
    return () => {
      stop = true;
    };
  }, []);

  const { rows, sections } = useMemo(() => {
    const q = query.trim();
    if (!q) {
      const recentRows: Row[] = recent.flatMap((r): Row[] => {
        const p = site.pages.find((x) => x.id === r.pageId);
        if (!p) return [];
        if (r.kind === "page") return [{ key: `recent:page:${p.id}`, kind: "page", title: p.title, sub: p.slug, run: () => setPage(p.id) }];
        const b = pageBlocks(p).find((x) => x.id === r.id);
        if (!b) return [];
        return [{ key: `recent:block:${r.id}`, kind: "block", title: b.label, sub: p.id === pageId ? b.type : `${b.type} · ${p.title}`, run: () => goToBlock(p.id, r.id) }];
      });
      const actionRows = ACTIONS.filter((a) => a.common && canRun(a.id)).map((a) => actionRow(a.id, a.title));
      return { rows: [...recentRows, ...actionRows], sections: [recentRows.length ? { at: 0, label: "Recent" } : null, { at: recentRows.length, label: "Actions" }].filter(Boolean) as { at: number; label: string }[] };
    }

    type Cand = { row: Row; texts: string[] };
    const cands: Cand[] = [];
    for (const p of site.pages) cands.push({ row: { key: `page:${p.id}`, kind: "page", title: p.title, sub: p.slug, run: () => setPage(p.id) }, texts: [p.title, p.slug, "page go to"] });
    for (const b of pageBlocks(page)) cands.push({ row: { key: `block:${b.id}`, kind: "block", title: b.label, sub: `${b.type} on ${page.title}`, run: () => selectBlock(b.id) }, texts: [b.label, b.type] });
    const below = insertAnchorName(page, selection);
    for (const e of CATALOG) cands.push({ row: { key: `insert:${e.type}`, kind: "insert", title: `Add ${e.label}`, sub: below ? `Below ${below}` : "At the end of the page", run: () => void insertBlock(e.type) }, texts: [e.label, `add ${e.label}`, e.hint] });
    for (const m of media.filter((x) => x.kind === "image" || x.kind === "video")) {
      const run = () => {
        const sel = getState().selection[0];
        const at = sel ? pageBlocks(currentPage(getState())).find((x) => x.id === sel) : null;
        if (sel && at?.type === "Image" && m.kind === "image") replaceImage(sel, m);
        else placeMedia(selectedEl(), m);
      };
      cands.push({ row: { key: `media:${m.key}`, kind: "media", title: m.name, sub: m.kind === "image" ? "Image" : "Video", run }, texts: [m.name, m.kind] });
    }
    for (const a of ACTIONS) if (!a.hidden && canRun(a.id)) cands.push({ row: actionRow(a.id, a.title), texts: [a.title, a.keywords ?? ""] });

    const ranked = rank(cands, q, (c) => c.texts).slice(0, 40);
    const out = ranked.map((r) => r.item.row);
    if (looksLikeSentence(q, ranked[0]?.score ?? null)) out.unshift(claudeRow(q, connected, setNote));
    return { rows: out, sections: [] as { at: number; label: string }[] };
  }, [query, recent, site, page, pageId, selection, media, connected]);

  const current = rows[Math.min(index, rows.length - 1)];
  useEffect(() => setIndex(0), [query]);
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const choose = (row: Row | undefined) => {
    if (!row) return;
    if (row.kind !== "connect") closePalette();
    row.run();
  };

  return (
    <div className="ed-pal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && closePalette()}>
      <div className="ed-pal" role="dialog" aria-modal="true" aria-label="Search and commands">
        <div className="ed-pal-head">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
          <input
            className="ed-pal-search"
            autoFocus
            placeholder="Search, or ask Claude to do something…"
            aria-label="Search pages, blocks, media and actions"
            role="combobox"
            aria-expanded="true"
            aria-controls="ed-pal-list"
            aria-activedescendant={current ? `ed-pal-${index}` : undefined}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setNote(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(rows.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (query.trim()) choose(claudeRow(query.trim(), connected, setNote));
              } else if (e.key === "Enter") {
                e.preventDefault();
                choose(current);
              } else if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                closePalette();
              }
            }}
          />
          <kbd className="ed-pal-esc">Esc</kbd>
        </div>
        <ul id="ed-pal-list" ref={list} role="listbox" aria-label="Results">
          {rows.map((row, i) => (
            <PaletteRow key={row.key} row={row} i={i} active={row === current} heading={sections.find((s) => s.at === i)?.label} onHover={() => setIndex(i)} onChoose={() => choose(row)} />
          ))}
          {!rows.length ? <li className="ed-pal-empty">Nothing matches "{query}".</li> : null}
        </ul>
        <footer className="ed-pal-foot">
          {note ? (
            <span role="status">{note}</span>
          ) : (
            <span className="ed-pal-hint">
              ↑↓ choose · ↵ open · <kbd>{keyLabels(shortcutFor("palette.open")!)[0]}</kbd>↵ ask Claude · Esc close
            </span>
          )}
        </footer>
      </div>
    </div>
  );
}

function PaletteRow({ row, i, active, heading, onHover, onChoose }: { row: Row; i: number; active: boolean; heading?: string; onHover: () => void; onChoose: () => void }) {
  return (
    <>
      {heading ? (
        <li className="ed-pal-heading" role="presentation">
          {heading}
        </li>
      ) : null}
      <li id={`ed-pal-${i}`} role="option" aria-selected={active} className={`ed-pal-row is-${row.kind}`} onPointerMove={onHover} onClick={onChoose}>
        <span className="ed-pal-chip">{CHIP[row.kind]}</span>
        <span className="ed-pal-text">
          <span className="ed-pal-title">{row.title}</span>
          {row.sub ? <span className="ed-pal-sub">{row.sub}</span> : null}
        </span>
        {row.keys ? (
          <span className="ed-pal-keys" aria-label={`Shortcut ${row.keys.join(" ")}`}>
            {row.keys.map((k) => (
              <kbd key={k}>{k}</kbd>
            ))}
          </span>
        ) : null}
      </li>
    </>
  );
}

/** The top row for a sentence: send it to Claude, or explain how to connect Claude first. */
function claudeRow(text: string, connected: boolean | null, setNote: (n: string) => void): Row {
  const mod = keyLabels(shortcutFor("palette.open")!)[0]!;
  if (connected === false) {
    const url = `${location.origin}/mcp`;
    return {
      key: "connect",
      kind: "connect",
      title: "Connect Claude",
      sub: `In Claude, add a custom connector with ${url} and the editor password. Enter copies the URL.`,
      run: () => {
        void navigator.clipboard?.writeText(url).catch(() => undefined);
        setNote(`Copied ${url}. Add it in Claude under Settings → Connectors.`);
      },
    };
  }
  return {
    key: "claude",
    kind: "claude",
    title: "Ask Claude to do this",
    sub: text,
    keys: [mod, "↵"],
    run: () => {
      askClaude(text);
      noteAsked(text);
    },
  };
}

function goToBlock(pageId: string, id: string) {
  if (getState().pageId !== pageId) {
    setPage(pageId);
    // The page's frame redraws first; then the block can be found and selected.
    setTimeout(() => selectBlock(id), 400);
  } else selectBlock(id);
}
