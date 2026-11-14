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

export type ComponentCategory = "basic" | "media" | "embed" | "site";

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
};

export function defineComponent<C>(def: ComponentDef<C>): ComponentDef<C> {
  return def;
}
