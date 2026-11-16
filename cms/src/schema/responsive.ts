import { z } from "zod";

/**
 * The core responsive rule (SPEC §3): the base is mobile. Desktop inherits
 * from it and stores only the values that were changed. `tablet` can be added
 * later as another optional key without touching stored content.
 */
export type Responsive<T> = { base: T; desktop?: Partial<T> };

export type Breakpoint = "mobile" | "desktop";
export const BREAKPOINTS: Breakpoint[] = ["mobile", "desktop"];

/** Min-width (px) at which the desktop layout applies. */
export const DESKTOP_MIN = 900;
/** Design widths used by canvas sections and the editor preview. */
export const DESIGN_WIDTH: Record<Breakpoint, number> = { mobile: 390, desktop: 1440 };

export function responsive<T extends z.ZodObject>(shape: T) {
  return z.object({ base: shape, desktop: shape.partial().optional() });
}
