import { useEffect, useState } from "react";
import { BREAKPOINT_LABEL, type Breakpoint } from "../../schema";
import { frameRects, getBoard, revealRect } from "../board/store";
import { getState, setBreakpoint, setPage, useEditor } from "../store";
import { startPresence, useOthers, type Other } from "./store";

/**
 * Other people in the editor, drawn on the board: their pointer on whichever frame they're working
 * in, an outline round what they've selected, and a quiet note when you pick the same block as
 * someone else (a soft lock: it warns, it never stops you).
 */

const frameDoc = () => document.querySelector<HTMLIFrameElement>("#preview-frame")?.contentDocument ?? null;
const origin = (bp: Breakpoint) => frameRects(getBoard()).find((f) => f.bp === bp) ?? null;
const toScreen = (bp: Breakpoint, x: number, y: number) => {
  const o = origin(bp);
  if (!o) return null;
  const { view } = getBoard();
  return { x: (o.x + x) * view.zoom + view.x, y: (o.y + y) * view.zoom + view.y };
};

type Box = { id: string; color: string; name: string; x: number; y: number; w: number; h: number };
type Cur = { id: string; color: string; name: string; x: number; y: number };

export function PresenceLayer() {
  const others = useOthers();
  const pageId = useEditor((s) => s.pageId);
  const bp = useEditor((s) => s.bp);
  const selection = useEditor((s) => s.selection);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [curs, setCurs] = useState<Cur[]>([]);

  useEffect(() => startPresence(), []);

  const here = others.filter((o) => o.pageId === pageId);
  useEffect(() => {
    if (!here.length) {
      setBoxes([]);
      setCurs([]);
      return;
    }
    let raf = 0;
    let last = "";
    const tick = () => {
      const doc = frameDoc();
      const b: Box[] = [];
      const c: Cur[] = [];
      for (const o of here) {
        if (o.cur) {
          const p = toScreen(o.bp, o.cur.x, o.cur.y);
          if (p) c.push({ id: o.clientId, color: o.color, name: o.name, x: Math.round(p.x), y: Math.round(p.y) });
        }
        // their selection can only be measured on the frame you can edit, so it shows when you share a screen size
        if (doc && o.bp === bp)
          for (const id of o.sel.slice(0, 6)) {
            const el = doc.querySelector(`[data-node-id="${CSS.escape(id)}"]`);
            if (!el) continue;
            const r = el.getBoundingClientRect();
            const p = toScreen(bp, r.left, r.top);
            if (!p || (!r.width && !r.height)) continue;
            const z = getBoard().view.zoom;
            b.push({ id: `${o.clientId}:${id}`, color: o.color, name: o.name, x: Math.round(p.x), y: Math.round(p.y), w: Math.round(r.width * z), h: Math.round(r.height * z) });
          }
      }
      const key = JSON.stringify([b, c]);
      if (key !== last) {
        last = key;
        setBoxes(b);
        setCurs(c);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(here), bp]);

  const sharing = here.filter((o) => o.sel.some((id) => selection.includes(id)));

  return (
    <div className="ed-pres-layer" aria-hidden={!sharing.length}>
      {boxes.map((b) => (
        <div key={b.id} className="ed-pres-box" style={{ left: b.x, top: b.y, width: b.w, height: b.h, borderColor: b.color }}>
          <span style={{ background: b.color }}>{b.name}</span>
        </div>
      ))}
      {curs.map((c) => (
        <div key={c.id} className="ed-pres-cur" style={{ left: c.x, top: c.y, color: c.color }} data-name={c.name}>
          <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true">
            <path d="M1 1l13 7-6 1.6L5 16z" fill="currentColor" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
          <span style={{ background: c.color }}>{c.name}</span>
        </div>
      ))}
      {sharing.length ? (
        <div className="ed-pres-lock" role="status">
          <i style={{ background: sharing[0]!.color }} />
          {names(sharing)} {sharing.length > 1 ? "are" : "is"} working on this block too. Your changes and theirs both go in, so talk first if it's a big one.
        </div>
      ) : null}
    </div>
  );
}

const names = (list: Other[]) => (list.length === 1 ? list[0]!.name : `${list.slice(0, -1).map((o) => o.name).join(", ")} and ${list.at(-1)!.name}`);
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** Go to where someone is: their page, their screen size, and their selection if they have one. */
export function goToPerson(o: Other) {
  if (o.pageId && getState().pageId !== o.pageId) setPage(o.pageId);
  setBreakpoint(o.bp);
  let tries = 0;
  const look = () => {
    const doc = frameDoc();
    const id = o.sel[0];
    const el = id && doc?.querySelector(`[data-node-id="${CSS.escape(id)}"]`);
    if (!el) return void (id && ++tries < 30 && setTimeout(look, 100));
    const r = el.getBoundingClientRect();
    const f = origin(o.bp);
    if (f) revealRect({ x: f.x + r.left, y: f.y + r.top, w: r.width, h: Math.min(r.height, 600) });
  };
  setTimeout(look, 60);
}

/** Everyone else here, as a row of faces in the top bar. */
export function Avatars() {
  const others = useOthers();
  const pages = useEditor((s) => s.site.pages);
  useEffect(() => startPresence(), []);
  if (!others.length) return null;
  const shown = others.slice(0, 4);
  return (
    <div className="ed-pres-faces" role="group" aria-label={`${others.length} other ${others.length === 1 ? "person" : "people"} editing`}>
      {shown.map((o) => {
        const page = pages.find((p) => p.id === o.pageId)?.title ?? "another page";
        const where = `${o.name} · ${page} · ${BREAKPOINT_LABEL[o.bp]}`;
        return (
          <button key={o.clientId} type="button" className="ed-pres-face" style={{ background: o.color }} aria-label={`Go to ${where}`} title={where} onClick={() => goToPerson(o)}>
            {initials(o.name)}
          </button>
        );
      })}
      {others.length > shown.length ? <span className="ed-pres-more">+{others.length - shown.length}</span> : null}
    </div>
  );
}
