/**
 * A few words bigger or smaller than the rest of their text: steps relative to it (em), never
 * pixels, so they follow the text's own size on every screen. Kept apart from schema/rich.ts so
 * the public site can draw them without loading the checks.
 */
export const RICH_SIZES = { s: 0.8, l: 1.25, xl: 1.6, xxl: 2 } as const;
export type RichSize = keyof typeof RICH_SIZES;
export const RICH_SIZE_LABEL: Record<RichSize, string> = { s: "Small", l: "Large", xl: "Larger", xxl: "Huge" };
