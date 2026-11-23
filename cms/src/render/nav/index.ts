import { pillNav } from "./pill";
import type { NavRenderer } from "./types";

/** Registered nav styles. Add a renderer here to offer another style (SPEC §6). */
// The bar shares the pill's markup and script; its look comes from [data-nav="bar"] rules in the same CSS.
const renderers: Record<string, NavRenderer> = { pill: pillNav, bar: { ...pillNav, style: "bar" } };

export function navRenderer(style: string): NavRenderer {
  return renderers[style] ?? pillNav;
}
export const NAV_STYLES = Object.keys(renderers);
export * from "./model";
export type { NavRenderer } from "./types";
