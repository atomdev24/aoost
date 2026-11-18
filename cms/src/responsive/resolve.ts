import type { Breakpoint, Responsive } from "../schema";

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  // Keys holding undefined count as absent: that is how the data looks once it has been through JSON.
  const ra = a as Record<string, unknown>;
  const rb = b as Record<string, unknown>;
  const ka = Object.keys(ra).filter((k) => ra[k] !== undefined);
  const kb = Object.keys(rb).filter((k) => rb[k] !== undefined);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual(ra[k], rb[k]));
}

type Rec = Record<string, unknown>;
const OVERRIDES = ["desktop", "tablet", "widescreen"] as const;
/**
 * Canvas lengths (a layer's box, an artboard's height) are in each size's own
 * design pixels, so a tablet or widescreen value that happens to equal the
 * inherited number is still its own value: these keys are never dropped there.
 */
const OWN_SPACE = new Set(["x", "y", "w", "h", "height"]);

/**
 * The value in effect at a breakpoint (see schema/responsive.ts for the cascade):
 * mobile is the base, tablet and desktop lay their overrides over it, and
 * widescreen lays its own over desktop's.
 */
export function resolve<T extends object>(r: Responsive<T>, bp: Breakpoint): T {
  if (bp === "mobile") return r.base;
  const layers: (Partial<T> | undefined)[] = bp === "widescreen" ? [r.desktop, r.widescreen] : [r[bp]];
  if (!layers.some(Boolean)) return r.base;
  const out = { ...r.base } as Rec;
  for (const layer of layers) if (layer) for (const [k, v] of Object.entries(layer)) if (v !== undefined) out[k] = v;
  return out as T;
}

/**
 * The size the editor compares a breakpoint against (its tint, "Reset to …").
 * Desktop is the editor's reference; mobile is shown as changes from desktop
 * (as before), tablet as changes from mobile, widescreen as changes from desktop.
 */
export const REFERENCE: Record<Breakpoint, Breakpoint | null> = { desktop: null, mobile: "desktop", tablet: "mobile", widescreen: "desktop" };

/** Keys whose desktop value differs from mobile (the editor's override dots). */
export function overriddenKeys<T extends object>(r: Responsive<T>): (keyof T)[] {
  if (!r.desktop) return [];
  return (Object.keys(r.desktop) as (keyof T)[]).filter(
    (k) => r.desktop![k] !== undefined && !deepEqual(r.desktop![k], r.base[k]),
  );
}

export function isOverridden<T extends object>(r: Responsive<T>, key: keyof T): boolean {
  return overriddenKeys(r).includes(key);
}

/** The keys a breakpoint changes from the size it is compared against (tinted fields, the scope bar count). */
export function overridesAt<T extends object>(r: Responsive<T>, bp: Breakpoint): (keyof T)[] {
  if (bp === "desktop") return [];
  if (bp === "mobile") return overriddenKeys(r);
  const own = r[bp];
  if (!own) return [];
  const ref = (bp === "tablet" ? r.base : resolve(r, "desktop")) as Rec;
  return (Object.keys(own) as (keyof T)[]).filter((k) => own[k] !== undefined && (OWN_SPACE.has(k as string) || !deepEqual(own[k], ref[k as string])));
}

export function isOverriddenAt<T extends object>(r: Responsive<T>, bp: Breakpoint, key: keyof T): boolean {
  return overridesAt(r, bp).includes(key);
}

/**
 * Apply an edit at the active breakpoint. Mobile edits write the base; other
 * sizes write overrides only, and an override equal to what that size would
 * inherit is dropped, so the stored JSON holds just what Alex changed.
 * `undefined` clears a value.
 */
export function setAt<T extends object>(r: Responsive<T>, bp: Breakpoint, patch: Partial<T>): Responsive<T> {
  const target = { ...((bp === "mobile" ? r.base : r[bp]) ?? {}) } as Rec;
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete target[k];
    else target[k] = v;
  }
  return prune(bp === "mobile" ? { ...r, base: target as T } : { ...r, [bp]: target as Partial<T> });
}

/** "Use on all sizes" from mobile: drop every size's override for one key, or all of them. */
export function resetToMobile<T extends object>(r: Responsive<T>, key?: keyof T): Responsive<T> {
  if (key === undefined) return { base: r.base };
  const next = { base: r.base } as Responsive<T>;
  for (const bp of OVERRIDES) {
    const layer = r[bp];
    if (!layer) continue;
    const copy = { ...layer };
    delete copy[key];
    next[bp] = copy;
  }
  return prune(next);
}

/** "Use on all sizes" from any breakpoint: the value shown there becomes every size's value. */
export function useEverywhere<T extends object>(r: Responsive<T>, bp: Breakpoint, key: keyof T): Responsive<T> {
  const value = (resolve(r, bp) as Rec)[key as string];
  const base = { ...r.base } as Rec;
  if (value === undefined) delete base[key as string];
  else base[key as string] = value;
  return resetToMobile({ ...r, base: base as T }, key);
}

/**
 * The side-by-side editor's rule: an edit made while a breakpoint is active
 * changes that breakpoint only. Desktop edits are plain overrides. A mobile
 * edit writes the base, so desktop first keeps the value it shows now as its
 * own override. A key with no value on desktop has nothing to keep, so it
 * follows the new base (the stored format has no "unset on desktop").
 * Tablet inherits mobile and widescreen inherits desktop, so they follow
 * edits there unless they have their own value.
 */
export function setOnly<T extends object>(r: Responsive<T>, bp: Breakpoint, patch: Partial<T>): Responsive<T> {
  if (bp !== "mobile") return setAt(r, bp, patch);
  const shown = resolve(r, "desktop") as Rec;
  const keep: Rec = {};
  for (const k of Object.keys(patch)) if (shown[k] !== undefined) keep[k] = shown[k];
  const next = setAt(r, "mobile", patch);
  return prune({ ...next, desktop: { ...(r.desktop ?? {}), ...keep } as Partial<T> });
}

/** Keys whose mobile value differs from desktop: the mobile overrides in the editor. */
export const mobileOverrides = overriddenKeys;

/** "Reset to desktop": mobile takes desktop's value for one key, or for every key. */
export function resetToDesktop<T extends object>(r: Responsive<T>, key?: keyof T): Responsive<T> {
  if (!r.desktop) return r;
  const keys = key === undefined ? (Object.keys(r.desktop) as (keyof T)[]) : [key];
  const base = { ...r.base } as Rec;
  const desktop = { ...r.desktop } as Rec;
  for (const k of keys as string[]) {
    if (desktop[k] === undefined) continue;
    base[k] = desktop[k];
    delete desktop[k];
  }
  return prune({ ...r, base: base as T, desktop: desktop as Partial<T> });
}

/**
 * "Reset to <the size it is compared against>" at a breakpoint, for one key or
 * every key: mobile takes desktop's value; tablet and widescreen drop their own.
 */
export function resetAt<T extends object>(r: Responsive<T>, bp: Breakpoint, key?: keyof T): Responsive<T> {
  if (bp === "desktop") return r;
  if (bp === "mobile") return resetToDesktop(r, key);
  const own = r[bp];
  if (!own) return r;
  if (key === undefined) return prune({ ...r, [bp]: undefined });
  const copy = { ...own };
  delete copy[key];
  return prune({ ...r, [bp]: copy });
}

function prune<T extends object>(r: Responsive<T>): Responsive<T> {
  const out = { base: r.base } as Responsive<T>;
  const clean = (layer: Partial<T> | undefined, ref: Rec, ownSpace = false): Partial<T> | undefined => {
    if (!layer) return undefined;
    const kept: Rec = {};
    for (const [k, v] of Object.entries(layer)) if (v !== undefined && ((ownSpace && OWN_SPACE.has(k)) || !deepEqual(v, ref[k]))) kept[k] = v;
    return Object.keys(kept).length ? (kept as Partial<T>) : undefined;
  };
  // Key order matches the schema (base, desktop, tablet, widescreen), so stored JSON is stable.
  const desktop = clean(r.desktop, r.base as Rec);
  if (desktop) out.desktop = desktop;
  const tablet = clean(r.tablet, r.base as Rec, true);
  if (tablet) out.tablet = tablet;
  const widescreen = clean(r.widescreen, resolve(out, "desktop") as Rec, true);
  if (widescreen) out.widescreen = widescreen;
  return out;
}
