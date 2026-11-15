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

/** The value in effect at a breakpoint: mobile base, with desktop overrides on top. */
export function resolve<T extends object>(r: Responsive<T>, bp: Breakpoint): T {
  if (bp === "mobile" || !r.desktop) return r.base;
  const out = { ...r.base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(r.desktop)) if (v !== undefined) out[k] = v;
  return out as T;
}

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

/**
 * Apply an edit at the active breakpoint. Mobile edits write the base; desktop
 * edits write overrides only, and an override equal to the base is dropped so
 * the stored JSON holds just what Alex changed. `undefined` clears a value.
 */
export function setAt<T extends object>(r: Responsive<T>, bp: Breakpoint, patch: Partial<T>): Responsive<T> {
  if (bp === "mobile") {
    const base = { ...r.base } as Record<string, unknown>;
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) delete base[k];
      else base[k] = v;
    }
    return prune({ base: base as T, desktop: r.desktop });
  }
  const desktop = { ...(r.desktop ?? {}) } as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete desktop[k];
    else desktop[k] = v;
  }
  return prune({ base: r.base, desktop: desktop as Partial<T> });
}

/** "Reset to mobile": drop the desktop override for one key, or all of them. */
export function resetToMobile<T extends object>(r: Responsive<T>, key?: keyof T): Responsive<T> {
  if (!r.desktop) return r;
  if (key === undefined) return { base: r.base };
  const desktop = { ...r.desktop };
  delete desktop[key];
  return prune({ base: r.base, desktop });
}

function prune<T extends object>(r: Responsive<T>): Responsive<T> {
  if (!r.desktop) return { base: r.base };
  const desktop: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r.desktop)) {
    if (v !== undefined && !deepEqual(v, (r.base as Record<string, unknown>)[k])) desktop[k] = v;
  }
  return Object.keys(desktop).length ? { base: r.base, desktop: desktop as Partial<T> } : { base: r.base };
}
