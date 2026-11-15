import type { ReactElement } from "react";
import type { z } from "zod";
import type { Breakpoint, LinkTarget, Node, Page, Site, Style } from "../schema";

/** What a component can ask of its surroundings, on the public site and in the editor. */
export type RenderCtx = {
  site: Site;
  /** The page being rendered; null inside nav panels and previews of globals. */
  page: Page | null;
  /** True inside the editor canvas: no navigation, no autoplay, placeholders for empty content. */
  editing: boolean;
  /** The editor's active breakpoint. Undefined on the public site (CSS decides). */
  bp?: Breakpoint;
  href(target: LinkTarget): string;
};

export type ComponentCategory = "basic" | "media" | "embed" | "site" | "aoost";

/**
 * A kit is what a family of components shares and brings to any page that uses one of them:
 * scoped CSS, fonts, a script, and a class on <main>. The aoost homepage blocks are a kit.
 */
export type ComponentKit = {
  id: string;
  /** Inlined once, before the components' own CSS. */
  css: string;
  /** Inlined once, after the components' own CSS (overrides such as reduced motion). */
  cssAfter?: string;
  /** Google Fonts families these components need, e.g. "Lexend:wght@300;400;500". */
  googleFonts?: string[];
  /** A deferred script loaded only on pages that use the kit. */
  script?: string;
  /** Classes added to <main> on pages that use the kit. */
  mainClass?: string;
};

export type ComponentDef<C = Record<string, unknown>> = {
  type: string;
  label: string;
  category: ComponentCategory;
  /** Content schema: shared across breakpoints. */
  schema: z.ZodType<C>;
  defaults: { content: C; style?: Style };
  /** Media components sit in a frame and get fit / focal point / zoom / pan. */
  framed?: boolean;
  Render: (props: { node: Node; content: C; ctx: RenderCtx }) => ReactElement | null;
  /** Component CSS, inlined once per page that uses it. */
  css: string;
  /** The kit this component belongs to, if any. */
  kit?: ComponentKit;
  /**
   * A band: consecutive sections whose first component returns the same value are wrapped together
   * in one <div class="..."> on the site, so they can share a continuous background.
   */
  band?: (content: C) => string | undefined;
};

export function defineComponent<C>(def: ComponentDef<C>): ComponentDef<C> {
  return def;
}
