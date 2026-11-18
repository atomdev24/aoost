import { z } from "zod";

/**
 * The core responsive rule (SPEC §3): the base is mobile. Every other size
 * stores only the values that were changed, as an optional key, so content
 * without tablet or widescreen values is stored exactly as before.
 *
 * Cascade (see DECISIONS.md, breakpoints):
 *   mobile      = base
 *   tablet      = base ⊕ tablet               (a tablet screen showed the mobile layout before)
 *   desktop     = base ⊕ desktop
 *   widescreen  = base ⊕ desktop ⊕ widescreen
 */
export type Responsive<T> = { base: T; desktop?: Partial<T>; tablet?: Partial<T>; widescreen?: Partial<T> };

export type Breakpoint = "mobile" | "tablet" | "desktop" | "widescreen";
/** Narrowest first. */
export const BREAKPOINTS: Breakpoint[] = ["mobile", "tablet", "desktop", "widescreen"];
/** The sizes that store overrides (everything but the mobile base). */
export type OverrideBreakpoint = Exclude<Breakpoint, "mobile">;

/** The size a breakpoint inherits from (mobile is the stored base and inherits nothing). */
export const PARENT: Record<OverrideBreakpoint, Breakpoint> = { tablet: "mobile", desktop: "mobile", widescreen: "desktop" };

/** Min-width (px) at which the tablet layout applies; it ends where desktop starts. */
export const TABLET_MIN = 600;
/** Min-width (px) at which the desktop layout applies. */
export const DESKTOP_MIN = 900;
/** Min-width (px) at which the widescreen layout applies. */
export const WIDESCREEN_MIN = 1600;
/** Design widths used by canvas sections and the editor preview. */
export const DESIGN_WIDTH: Record<Breakpoint, number> = { mobile: 390, tablet: 834, desktop: 1440, widescreen: 1920 };

export const BREAKPOINT_LABEL: Record<Breakpoint, string> = { mobile: "Mobile", tablet: "Tablet", desktop: "Desktop", widescreen: "Widescreen" };

export function responsive<T extends z.ZodObject>(shape: T) {
  return z.object({
    base: shape,
    desktop: shape.partial().optional(),
    tablet: shape.partial().optional(),
    widescreen: shape.partial().optional(),
  });
}
