import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { locate } from "../../model/page-ops";
import { alignSelection, distributeSelection, findCanvas } from "../canvas/actions";
import { hasClip, hasStyleClip } from "../canvas/clipboard-actions";
import { canRun, runAction } from "../commands/run";
import { actionById, type ActionId } from "../commands/registry";
import { isMac, keyLabels, shortcutFor } from "../commands/shortcuts";
import { currentPage, getState } from "../store";
import { closeContextMenu, useContextMenu, type ContextTarget } from "./context-store";
import "./context-menu.css";

/*
 * The right-click menu on the page (menu/attach.ts opens it). Rows run the same actions as the
 * shortcuts and ⌘K, and show their keys. Sub-menus open to the side and stay open while the
 * pointer heads into them across a corner (the "safe triangle", EDITOR-UI-RESEARCH.md rule 8).
 */

type Row =
  | { kind: "action"; id: ActionId; label?: string; enabled?: boolean; danger?: boolean }
  | { kind: "run"; label: string; run: () => void; enabled?: boolean }
  | { kind: "sub"; label: string; rows: Row[] }
  | { kind: "sep" };

const act = (id: ActionId, extra: Partial<Extract<Row, { kind: "action" }>> = {}): Row => ({ kind: "action", id, ...extra });
const SEP: Row = { kind: "sep" };

function rowsFor(t: ContextTarget): Row[] {
  const page = currentPage(getState());
  const sel = getState().selection;
  const canvas = t.id && t.kind === "node" ? findCanvas(page, t.id) : undefined;
  const layers = canvas ? sel.filter((id) => canvas.children.some((n) => n.id === id)).length : 0;
  const clip = hasClip();
  if (t.kind === "page") return [act("block.paste", { enabled: clip }), SEP, act("insert.quick", { label: "Add a block…" }), act("tool.section", { label: "Add a section" })];
  const node = t.kind === "node";
  const rows: Row[] = [
    act("block.cut"),
    act("block.copy"),
    act("block.paste", { enabled: clip, label: node ? "Paste after" : "Paste into section" }),
    act("block.duplicate"),
  ];
  if (node) rows.push(SEP, act("block.copyStyle"), act("block.pasteStyle", { enabled: hasStyleClip() }));
  rows.push(SEP, act("block.moveUp"), act("block.moveDown"));
  if (canvas)
    rows.push({
      kind: "sub",
      label: layers > 1 ? `Align ${layers} layers` : "Align to the frame",
      rows: [
        { kind: "run", label: "Left", run: () => alignSelection("left") },
        { kind: "run", label: "Centre", run: () => alignSelection("center") },
        { kind: "run", label: "Right", run: () => alignSelection("right") },
        SEP,
        { kind: "run", label: "Top", run: () => alignSelection("top") },
        { kind: "run", label: "Middle", run: () => alignSelection("middle") },
        { kind: "run", label: "Bottom", run: () => alignSelection("bottom") },
        SEP,
        { kind: "run", label: "Space evenly across", run: () => distributeSelection("x"), enabled: layers >= 3 },
        { kind: "run", label: "Space evenly down", run: () => distributeSelection("y"), enabled: layers >= 3 },
      ],
    });
  rows.push(act("block.hide"));
  if (getState().bp !== "desktop") rows.push(act("block.resetOverrides", { label: "Reset to desktop" }));
  if (node) rows.push(SEP, act("block.toBoard"));
  rows.push(SEP, act("block.delete", { danger: true }));
  return rows;
}

const enabled = (r: Row) => (r.kind === "action" ? r.enabled !== false && canRun(r.id) : r.kind === "run" ? r.enabled !== false : r.kind === "sub");
const keysOf = (id: ActionId) => {
  const s = shortcutFor(id);
  return s ? keyLabels(s).join(isMac() ? "" : "+") : "";
};

export function ContextMenuHost() {
  const t = useContextMenu();
  if (!t) return null;
  // The target may have gone (undo, another person's edit).
  if (t.id && !locate(currentPage(getState()), t.id)) return null;
  return createPortal(<Menu rows={rowsFor(t)} x={t.x} y={t.y} label={t.kind === "page" ? "Page" : t.kind === "section" ? "Section" : "Block"} onDone={closeContextMenu} root />, document.body);
}

type Pt = { x: number; y: number };
/** Is p inside the triangle a-b-c? */
const inTriangle = (p: Pt, a: Pt, b: Pt, c: Pt) => {
  const s = (p1: Pt, p2: Pt, p3: Pt) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const d1 = s(p, a, b);
  const d2 = s(p, b, c);
  const d3 = s(p, c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};

function Menu({ rows, x, y, label, onDone, root, side = "right", onBack }: { rows: Row[]; x: number; y: number; label: string; onDone: () => void; root?: boolean; side?: "right" | "left"; onBack?: () => void }) {
  const ref = useRef<HTMLUListElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [subAt, setSubAt] = useState<{ x: number; y: number; side: "right" | "left" } | null>(null);
  const subRef = useRef<HTMLUListElement | null>(null);
  const last = useRef<Pt | null>(null);
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Stay inside the window: a root menu flips up/left at the edges; a sub-menu flips to the other side.
  useLayoutEffect(() => {
    const el = ref.current!;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = side === "left" ? x - w : x + w > innerWidth - 8 ? (root ? Math.max(8, x - w) : x) : x;
    const top = y + h > innerHeight - 8 ? Math.max(8, root ? y - h : innerHeight - h - 8) : y;
    setPos({ left, top });
    if (root) el.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true });
  }, [x, y, side, root]);

  // Close on a press outside, a scroll of the board, Escape (root), or the window losing focus.
  useEffect(() => {
    if (!root) return;
    const down = (e: PointerEvent) => !(e.target as Element).closest?.(".ed-ctx") && onDone();
    const key = (e: KeyboardEvent) => e.key === "Escape" && (e.preventDefault(), e.stopPropagation(), onDone());
    const t = setTimeout(() => document.addEventListener("pointerdown", down, true));
    // On the window, so it runs before the editor's own Escape (step out of the selection).
    addEventListener("keydown", key, true);
    addEventListener("blur", onDone);
    addEventListener("wheel", onDone, { passive: true });
    return () => {
      clearTimeout(t);
      document.removeEventListener("pointerdown", down, true);
      removeEventListener("keydown", key, true);
      removeEventListener("blur", onDone);
      removeEventListener("wheel", onDone);
    };
  }, [root, onDone]);

  const openSub = (i: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const right = r.right + 220 < innerWidth;
    setSubAt({ x: right ? r.right + 2 : r.left - 2, y: r.top - 4, side: right ? "right" : "left" });
    setOpen(i);
  };

  /** Hovering a row: switch sub-menus at once, unless the pointer is on its way into the open one. */
  const hover = (i: number, el: HTMLElement, e: React.PointerEvent) => {
    clearTimeout(pending.current);
    const p = { x: e.clientX, y: e.clientY };
    const sub = subRef.current?.getBoundingClientRect();
    const go = () => (rows[i]!.kind === "sub" ? openSub(i, el) : setOpen(null));
    if (open !== null && open !== i && sub && last.current) {
      const edge = subAt?.side === "left" ? sub.right : sub.left;
      if (inTriangle(p, last.current, { x: edge, y: sub.top }, { x: edge, y: sub.bottom })) {
        pending.current = setTimeout(go, 250);
        last.current = p;
        return;
      }
    }
    last.current = p;
    if (open !== i) go();
  };
  useEffect(() => () => clearTimeout(pending.current), []);

  const run = (r: Row, i: number, el: HTMLElement) => {
    if (!enabled(r)) return;
    if (r.kind === "sub") return openSub(i, el);
    onDone();
    if (r.kind === "action") runAction(r.id);
    else if (r.kind === "run") r.run();
  };

  const keys = (e: React.KeyboardEvent) => {
    const items = [...ref.current!.querySelectorAll<HTMLButtonElement>(":scope > li > button:not(:disabled)")];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = items[(at + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length];
      next?.focus();
    } else if (e.key === "ArrowRight" && at >= 0) {
      const i = Number(items[at]!.dataset.i);
      if (rows[i]?.kind === "sub") (e.preventDefault(), openSub(i, items[at]!), setTimeout(() => subRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus()));
    } else if (e.key === "ArrowLeft" && onBack) {
      e.preventDefault();
      e.stopPropagation();
      onBack();
    }
  };

  const sub = open !== null ? rows[open] : null;
  return (
    <>
      <ul
        ref={ref}
        className={`ed-ctx${root ? " is-root" : ""}`}
        role="menu"
        aria-label={label}
        style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, transformOrigin: side === "left" ? "top right" : "top left" }}
        onKeyDown={keys}
        onContextMenu={(e) => e.preventDefault()}
      >
        {rows.map((r, i) =>
          r.kind === "sep" ? (
            <li key={`s${i}`} role="separator" className="ed-ctx-sep" />
          ) : (
            <li key={i} role="none">
              <button
                type="button"
                role="menuitem"
                data-i={i}
                disabled={!enabled(r)}
                aria-haspopup={r.kind === "sub" ? "menu" : undefined}
                aria-expanded={r.kind === "sub" ? open === i : undefined}
                className={`${r.kind === "action" && r.danger ? "is-danger" : ""}${open === i ? " is-open" : ""}`}
                onPointerMove={(e) => hover(i, e.currentTarget, e)}
                onClick={(e) => run(r, i, e.currentTarget)}
              >
                <span>{r.kind === "action" ? (r.label ?? actionById(r.id).title) : r.label}</span>
                {r.kind === "action" ? <kbd>{keysOf(r.id)}</kbd> : r.kind === "sub" ? <span className="ed-ctx-more" aria-hidden="true">›</span> : null}
              </button>
            </li>
          ),
        )}
      </ul>
      {sub?.kind === "sub" && subAt ? (
        <SubMenu
          rows={sub.rows}
          at={subAt}
          label={sub.label}
          onDone={onDone}
          subRef={subRef}
          onBack={() => {
            setOpen(null);
            ref.current?.querySelector<HTMLButtonElement>(`button[data-i="${open}"]`)?.focus();
          }}
        />
      ) : null}
    </>
  );
}

function SubMenu({ rows, at, label, onDone, subRef, onBack }: { rows: Row[]; at: { x: number; y: number; side: "right" | "left" }; label: string; onDone: () => void; subRef: React.MutableRefObject<HTMLUListElement | null>; onBack: () => void }) {
  const holder = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    subRef.current = holder.current?.querySelector("ul") ?? null;
    return () => {
      subRef.current = null;
    };
  });
  return (
    <div ref={holder} style={{ display: "contents" }}>
      <Menu rows={rows} x={at.x} y={at.y} label={label} onDone={onDone} side={at.side} onBack={onBack} />
    </div>
  );
}
