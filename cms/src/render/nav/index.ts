import { pillNav } from "./pill";
import type { NavRenderer } from "./types";

/** Registered nav styles. Add a renderer here to offer another style (SPEC §6). */
const renderers: Record<string, NavRenderer> = { pill: pillNav };

export function navRenderer(style: string): NavRenderer {
  return renderers[style] ?? pillNav;
}
export const NAV_STYLES = Object.keys(renderers);
export * from "./model";
export type { NavRenderer } from "./types";
