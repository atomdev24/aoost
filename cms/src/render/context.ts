import type { RenderCtx } from "../components/types";
import type { Page, Site } from "../schema";
import { hrefFor } from "./links";

export function makeCtx(site: Site, page: Page | null, opts: { editing?: boolean; prefix?: string } = {}): RenderCtx {
  return {
    site,
    page,
    editing: !!opts.editing,
    href: (target) => hrefFor(site, target, opts.prefix ?? ""),
  };
}
