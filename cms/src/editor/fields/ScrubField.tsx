import { useEffect, useRef, useState } from "react";
import { beginGesture, endGesture, useEditor } from "../store";
import { Menu, type Anchor } from "../ui/Popover";
import { PX_PER_STEP, scrubUnit } from "./scrub";
import { parseLength } from "./spacing";
import { useLongPress } from "../touch/longpress";

type Common = {
  glyph?: string;
  suffix?: string;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  min?: number;
  max?: number;
  step?: number;
  /** A spacing value: right-click offers the site's spacing steps. */
  spacing?: boolean;
};

const clamp = (n: number, min?: number, max?: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
const tidy = (n: number) => Math.round(n * 1000) / 1000;
const show = (n: number | undefined) => (n === undefined ? "" : String(tidy(n)));

/** The site's spacing steps for the right-click menu: None, S, M, L, XL (theme keys sm, md, lg, xl). */
export const SPACING_STEPS = [
  { label: "None", key: null },
  { label: "S", key: "sm" },
  { label: "M", key: "md" },
  { label: "L", key: "lg" },
  { label: "XL", key: "xl" },
] as const;
const FALLBACK_SPACING: Record<string, number> = { sm: 8, md: 16, lg: 28, xl: 48 };

/**
 * Dragging the glyph left or right changes the value (one step per ~3px).
 * The whole drag is one undo step. Returns pointer handlers for the glyph.
 */
function useScrub(get: () => number, set: (n: number) => void, step: number, decimals: boolean) {
  const [active, setActive] = useState(false);
  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const start = get();
    let travelled = 0;
    let lastX = e.clientX;
    let value = start;
    let moved = false;
    const move = (m: PointerEvent) => {
      const dx = m.clientX - lastX;
      lastX = m.clientX;
      travelled += dx;
      const steps = Math.trunc(travelled / PX_PER_STEP);
      if (!steps) return;
      travelled -= steps * PX_PER_STEP;
      const unit = scrubUnit(step, { shiftKey: m.shiftKey, altKey: m.altKey && decimals });
      value = tidy(value + steps * unit);
      if (!moved) {
        moved = true;
        setActive(true);
        beginGesture();
      }
      set(value);
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      if (moved) endGesture();
      setActive(false);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
  return { active, onPointerDown };
}

function SpacingMenu({ anchor, onPick, onClose }: { anchor: Anchor; onPick: (n: number) => void; onClose: () => void }) {
  const scale = useEditor((s) => s.site.theme.spacing);
  return (
    <Menu
      anchor={anchor}
      label="Spacing steps"
      onClose={onClose}
      items={SPACING_STEPS.map((s) => {
        const n = s.key ? (scale[s.key] ?? FALLBACK_SPACING[s.key]!) : 0;
        return { label: s.key ? `${s.label} · ${n}px` : s.label, onSelect: () => onPick(n) };
      })}
    />
  );
}

/**
 * A dense inspector number with a leading glyph. Drag the glyph to scrub
 * (Shift ×10, Alt ×0.1); type and press Enter to commit, Esc to revert;
 * ↑/↓ change it by one step (Shift ×10). Spacing fields offer the site's
 * spacing steps on right-click.
 */
export function ScrubNumber({ value, onChange, glyph, suffix, placeholder, id, ariaLabel, min, max, step = 1, spacing }: Common & { value: number | undefined; onChange: (v: number | undefined) => void }) {
  const [draft, setDraft] = useState(show(value));
  const [menu, setMenu] = useState<Anchor | null>(null);
  const live = useRef(value);
  live.current = value;
  useEffect(() => setDraft(show(value)), [value]);
  const decimals = step < 1;
  const put = (n: number) => {
    const next = clamp(decimals ? tidy(n) : Math.round(n), min, max);
    if (next !== live.current) {
      live.current = next;
      setDraft(show(next));
      onChange(next);
    }
  };
  const commit = (raw: string) => {
    if (raw.trim() === "") return value !== undefined && onChange(undefined);
    const n = Number(raw);
    if (Number.isNaN(n)) return setDraft(show(value));
    put(n);
    setDraft(show(clamp(decimals ? tidy(n) : Math.round(n), min, max)));
  };
  const scrub = useScrub(() => live.current ?? 0, put, step, decimals);
  // Touch: a long-press opens the spacing steps (right-click on a mouse).
  const press = useLongPress(setMenu, !!spacing);
  return (
    <span
      className={`ed-scrub${scrub.active ? " is-scrubbing" : ""}`}
      {...press}
      onContextMenu={
        spacing
          ? (e) => {
              e.preventDefault();
              setMenu({ x: e.clientX, y: e.clientY });
            }
          : undefined
      }
    >
      <span className="ed-scrub-glyph" aria-hidden="true" onPointerDown={scrub.onPointerDown} title="Drag to change · Shift ×10 · Alt fine">
        {glyph ?? "#"}
      </span>
      <input
        id={id}
        className="ed-scrub-input"
        type="text"
        inputMode="decimal"
        value={draft}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(draft);
          else if (e.key === "Escape") {
            e.stopPropagation();
            setDraft(show(value));
          } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            const base = Number(draft || value || 0);
            put((Number.isNaN(base) ? 0 : base) + (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? step * 10 : step));
          }
        }}
      />
      {suffix ? <span className="ed-scrub-suffix">{suffix}</span> : null}
      {menu ? <SpacingMenu anchor={menu} onClose={() => setMenu(null)} onPick={(n) => put(n)} /> : null}
    </span>
  );
}

/** A CSS length ("320px", "50%", "auto"). The number part scrubs and the unit is kept; "auto" scrubs from 0px. */
export function ScrubLength({ value, onChange, validate, glyph, placeholder, id, ariaLabel, spacing }: Common & { value: string | undefined; onChange: (v: string | undefined) => void; validate?: (v: string) => boolean }) {
  const [draft, setDraft] = useState(value ?? "");
  const [bad, setBad] = useState(false);
  const [menu, setMenu] = useState<Anchor | null>(null);
  const live = useRef(value);
  live.current = value;
  useEffect(() => setDraft(value ?? ""), [value]);
  const commit = (raw: string) => {
    const v = /^-?\d*\.?\d+$/.test(raw.trim()) ? `${raw.trim()}px` : raw.trim();
    if (v !== "" && validate && !validate(v)) return setBad(true);
    setBad(false);
    if (v !== (live.current ?? "")) {
      live.current = v || undefined;
      onChange(v || undefined);
    }
  };
  const unit = () => parseLength(live.current)?.unit ?? "px";
  const put = (n: number) => {
    const v = `${tidy(Math.max(0, n))}${unit()}`;
    setDraft(v);
    commit(v);
  };
  const scrub = useScrub(() => parseLength(live.current)?.n ?? 0, put, 1, true);
  const nudge = (d: number) => put((parseLength(live.current)?.n ?? 0) + d);
  const press = useLongPress(setMenu, !!spacing);
  return (
    <span
      className={`ed-scrub${scrub.active ? " is-scrubbing" : ""}`}
      {...press}
      onContextMenu={
        spacing
          ? (e) => {
              e.preventDefault();
              setMenu({ x: e.clientX, y: e.clientY });
            }
          : undefined
      }
    >
      <span className="ed-scrub-glyph" aria-hidden="true" onPointerDown={scrub.onPointerDown} title="Drag to change · Shift ×10 · Alt fine">
        {glyph ?? "#"}
      </span>
      <input
        id={id}
        className="ed-scrub-input"
        type="text"
        value={draft}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={bad || undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(draft);
          else if (e.key === "Escape") {
            e.stopPropagation();
            setDraft(value ?? "");
            setBad(false);
          } else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && (draft === "" || parseLength(draft))) {
            e.preventDefault();
            nudge((e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 10 : 1));
          }
        }}
      />
      {menu ? <SpacingMenu anchor={menu} onClose={() => setMenu(null)} onPick={(n) => put(n)} /> : null}
    </span>
  );
}
