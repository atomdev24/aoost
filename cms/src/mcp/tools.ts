import { z } from "zod";
import { components, getComponent } from "../components/registry";
import { addNavItem, findNavItem, moveNavItem, NAV_TYPE_LABELS, removeNavItem, setNavBehaviour, updateNavItem } from "../model/nav";
import { addNode, addSection, createNode, createSection, locate, moveNode, moveSection, remove, updateNode, updateSection } from "../model/page-ops";
import { createPage, renamePage, setParent, setSeo, setShowInNav, setSlug, setStatus } from "../model/pages";
import type { EditorContext } from "../model/protocol";
import { setAt } from "../responsive/resolve";
import { FrameFit, LinkTarget, NAV_ITEM_TYPES, SectionLayout, Style, type Node, type Page, type Responsive, type Section, type Site } from "../schema";

/**
 * The Claude connector's tools (SPEC §8). Everything here is a pure function
 * of the draft site: a tool returns the new site (or just text for reads),
 * and the Worker turns the difference into ops on the draft store. Nothing
 * a tool does is live until Publish.
 */
export type ToolResult = { text: string; site?: Site; summary?: string; changed?: string[] };
export type ToolContext = { site: Site; editor: EditorContext | null };
export type Tool<A = unknown> = { name: string; description: string; input: z.ZodType<A>; run?: (args: A, ctx: ToolContext) => ToolResult };

const json = (v: unknown) => JSON.stringify(v, null, 1);
class ToolError extends Error {}
const fail = (message: string): never => {
  throw new ToolError(message);
};

// ----------------------------------------------------------- resolving

const PageRef = z.string().describe('Page id or URL path, e.g. "about" or "/work/digital". Omit to use the page Alex has open in the editor.').optional();

function findPage(ctx: ToolContext, ref?: string): Page {
  const pages = ctx.site.pages;
  if (ref) return pages.find((p) => p.id === ref || p.slug === ref || p.slug === `/${ref.replace(/^\//, "")}`) ?? fail(`No page "${ref}". Pages: ${pages.map((p) => `${p.id} (${p.slug})`).join(", ")}`);
  return pages.find((p) => p.id === ctx.editor?.pageId) ?? pages.find((p) => p.isHome) ?? pages[0]!;
}

/** Find the page holding a node or section id: the given page, then the open page, then anywhere. */
function findOwner(ctx: ToolContext, id: string, ref?: string): Page {
  const order = [ref ? findPage(ctx, ref) : undefined, ctx.site.pages.find((p) => p.id === ctx.editor?.pageId), ...ctx.site.pages].filter((p): p is Page => !!p);
  return order.find((p) => locate(p, id)) ?? fail(`Nothing with id "${id}" on any page. Use get_page to see the ids.`);
}

const withPage = (site: Site, page: Page): Site => ({ ...site, pages: site.pages.map((p) => (p.id === page.id ? page : p)) });

const pageSummary = (p: Page) => ({ id: p.id, title: p.title, url: p.slug, status: p.status, parent: p.parentId, inNav: p.showInNav, isHome: p.isHome, sections: p.sections.length });

// ------------------------------------------------------------ schemas

const PartialStyle = Style.partial().describe(
  'Layout and look. Lengths are CSS strings ("100%", "320px"). Colours are CSS colours or theme tokens like "token:rust". radius is [topLeft, topRight, bottomRight, bottomLeft] in px. In a canvas section use x, y, w, h (design px: 390 wide on mobile, 834 on tablet, 1440 on desktop, 1920 on widescreen).',
);
const PartialLayout = SectionLayout.partial().describe('Section layout: columns, gap (px), padding (CSS shorthand like "56px 20px"), maxWidth (px), minHeight, height (canvas artboard height in px), background { color, image, video, poster, overlay }.');
const NodeInput = z.object({
  type: z.string().describe(`Component type. One of: ${components.map((c) => c.type).join(", ")}.`),
  content: z.record(z.string(), z.unknown()).optional().describe("Content for the component (shared across breakpoints). Unset fields use the component's defaults. See get_site → components for each type's fields."),
  style: PartialStyle.optional().describe("Mobile (base) style."),
  desktop_style: PartialStyle.optional().describe("Desktop overrides: only what differs from mobile."),
  name: z.string().optional().describe("Layer name shown in the editor."),
});

function buildNode(input: z.infer<typeof NodeInput>): Node {
  const def = getComponent(input.type) ?? fail(`Unknown component type "${input.type}". Types: ${components.map((c) => c.type).join(", ")}`);
  const node = createNode(def.type, { content: input.content, style: input.style as Style | undefined });
  const checked = def.schema.safeParse(node.content);
  if (!checked.success) fail(`Invalid content for ${def.type}: ${checked.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  return { ...node, name: input.name, style: input.desktop_style ? { base: node.style.base, desktop: input.desktop_style as Style } : node.style };
}

/** Describe what each component accepts, so Claude doesn't have to guess. */
function componentCatalogue() {
  return Object.fromEntries(components.map((c) => [c.type, { label: c.label, framed: !!c.framed, defaults: c.defaults.content }]));
}

// -------------------------------------------------------------- tools

const tool = <S extends z.ZodType>(name: string, description: string, input: S, run?: (args: z.infer<S>, ctx: ToolContext) => ToolResult): Tool => ({ name, description, input, run: run as Tool["run"] });

export const tools: Tool[] = [
  tool("list_pages", "List every page in the draft with its id, URL, status and place in the navigation.", z.object({}), (_a, ctx) => ({ text: json(ctx.site.pages.map(pageSummary)) })),

  tool("get_page", "Get one page in full: settings, sections, nodes (with ids, content and per-breakpoint style) and overlays.", z.object({ page: PageRef }), (a, ctx) => ({ text: json(findPage(ctx, a.page)) })),

  tool(
    "get_site",
    "Get site-wide data: settings, theme tokens (colours, fonts, text styles), navigation, global components, template names, diary entries, playlists, redirects, and the catalogue of component types with their default content.",
    z.object({}),
    (_a, ctx) => {
      const { pages, templates, ...rest } = ctx.site;
      return { text: json({ ...rest, templates: templates.map((t) => ({ id: t.id, name: t.name, kind: t.kind })), pages: pages.map(pageSummary), components: componentCatalogue(), breakpoints: { mobile: "base, 390px design width", tablet: "overrides on mobile for 600–899px screens, 834px design width (optional)", desktop: "overrides on mobile from 900px, 1440px design width", widescreen: "overrides on desktop from 1600px, 1920px design width (optional)" } }) };
    },
  ),

  tool(
    "get_editor_context",
    'What Alex is looking at in the editor right now: the open page, the selected node ids (with their type and content) and the active breakpoint. Use this to resolve "this", "that image", "make it rounder".',
    z.object({}),
    (_a, ctx) => {
      if (!ctx.editor) return { text: "The editor is not open, so there is no selection. Ask Alex which page or element he means, or use list_pages / get_page." };
      const page = ctx.site.pages.find((p) => p.id === ctx.editor!.pageId);
      const selected = ctx.editor.selectedNodeIds.map((id) => {
        const at = page ? locate(page, id) : null;
        if (!at) return { id, note: "not found on the open page" };
        return at.kind === "section" ? { id, kind: "section", sectionKind: at.section.kind, name: at.section.name, layout: at.section.layout } : { id, kind: at.kind, type: at.node.type, name: at.node.name, content: at.node.content, style: at.node.style, frame: at.node.frame, inSection: at.kind === "node" ? at.section.id : undefined };
      });
      return { text: json({ page: page ? pageSummary(page) : ctx.editor.pageId, breakpoint: ctx.editor.breakpoint, selected, secondsSinceUpdate: Math.round((Date.now() - ctx.editor.updatedAt) / 1000) }) };
    },
  ),

  tool(
    "add_section",
    "Add a section to a page, optionally with nodes in it. kind: flow (stacked), grid (columns, cells auto-flow) or canvas (free positioning with x/y/w/h per breakpoint). Returns the new ids.",
    z.object({
      page: PageRef,
      kind: z.enum(["flow", "grid", "canvas"]),
      name: z.string().optional(),
      index: z.number().int().min(0).optional().describe("Position on the page (0 = top). Default: before the footer section if there is one, else the end."),
      layout: PartialLayout.optional().describe("Mobile (base) layout."),
      desktop_layout: PartialLayout.optional().describe("Desktop overrides."),
      nodes: z.array(NodeInput).optional(),
    }),
    (a, ctx) => {
      const page = findPage(ctx, a.page);
      const base = createSection(a.kind, { name: a.name });
      const section: Section = {
        ...base,
        layout: { base: { ...base.layout.base, ...(a.layout as Partial<SectionLayout>) }, ...(a.desktop_layout || base.layout.desktop ? { desktop: { ...base.layout.desktop, ...(a.desktop_layout as Partial<SectionLayout>) } } : {}) },
        children: (a.nodes ?? []).map(buildNode),
      };
      const footer = page.sections.findIndex((s) => s.children.some((n) => n.type === "Footer" || (n.type === "Global" && ctx.site.globals.find((g) => g.id === n.content.globalId)?.node.type === "Footer")));
      const next = addSection(page, section, a.index ?? (footer >= 0 ? footer : undefined));
      return { site: withPage(ctx.site, next), text: json({ sectionId: section.id, nodeIds: section.children.map((n) => n.id), page: page.id }), summary: `Add ${a.kind} section${a.name ? ` "${a.name}"` : ""} to ${page.title}`, changed: [section.id] };
    },
  ),

  tool(
    "add_node",
    "Add a component to an existing section. In a canvas section give style x, y, w, h.",
    z.object({ page: PageRef, section_id: z.string(), node: NodeInput, index: z.number().int().min(0).optional().describe("Position in the section. Default: the end.") }),
    (a, ctx) => {
      const page = findOwner(ctx, a.section_id, a.page);
      if (locate(page, a.section_id)?.kind !== "section") fail(`"${a.section_id}" is not a section.`);
      const node = buildNode(a.node);
      return { site: withPage(ctx.site, addNode(page, a.section_id, node, a.index)), text: json({ nodeId: node.id }), summary: `Add ${getComponent(node.type)!.label} to ${page.title}`, changed: [node.id] };
    },
  ),

  tool(
    "update_node",
    "Change a node (or a section, or a global component by its global id): merge new content fields, mobile (base) style, frame fit, scroll effects, name or lock. For desktop-only changes use set_responsive_override instead. For a section pass layout.",
    z.object({
      page: PageRef,
      node_id: z.string(),
      content: z.record(z.string(), z.unknown()).optional().describe("Content fields to change; others are kept."),
      style: PartialStyle.optional().describe("Mobile (base) style values to change; keys you leave out are kept."),
      layout: PartialLayout.optional().describe("Sections only: mobile (base) layout values to change."),
      frame: FrameFit.partial().optional().describe("Media nodes: how content fits its frame (fit: fill | fit | free, focalX/focalY in %, zoom, panX/panY)."),
      effects: z.object({ enter: z.enum(["none", "fade", "slide-up", "slide-left", "slide-right", "scale"]).optional(), parallax: z.number().min(-1).max(1).optional(), sticky: z.boolean().optional() }).optional(),
      name: z.string().optional(),
      locked: z.boolean().optional(),
    }),
    (a, ctx) => {
      // A global component: edit once, update everywhere.
      const global = ctx.site.globals.find((g) => g.id === a.node_id);
      if (global) {
        const node = applyNodePatch(global.node, a);
        return { site: { ...ctx.site, globals: ctx.site.globals.map((g) => (g.id === global.id ? { ...g, node } : g)) }, text: `Updated global component "${global.name}" (used on every page that references it).`, summary: `Update global ${global.name}` };
      }
      const page = findOwner(ctx, a.node_id, a.page);
      const at = locate(page, a.node_id)!;
      if (at.kind === "section") {
        const next = updateSection(page, a.node_id, (s) => ({ ...s, name: a.name ?? s.name, locked: a.locked ?? s.locked, layout: a.layout ? setAt(s.layout, "mobile", a.layout as Partial<SectionLayout>) : s.layout }));
        return { site: withPage(ctx.site, next), text: `Updated section ${a.node_id}.`, summary: `Update section on ${page.title}`, changed: [a.node_id] };
      }
      const next = updateNode(page, at.node.id, (n) => applyNodePatch(n, a));
      return { site: withPage(ctx.site, next), text: `Updated ${at.node.type} ${at.node.id}.`, summary: `Update ${getComponent(at.node.type)?.label ?? at.node.type} on ${page.title}`, changed: [at.node.id] };
    },
  ),

  tool(
    "move_node",
    "Move a node to another position or another section, or move a section up or down the page.",
    z.object({ page: PageRef, node_id: z.string(), to_section_id: z.string().optional().describe("Target section. Default: stay in the same section."), index: z.number().int().min(0).describe("New position (0 = first).") }),
    (a, ctx) => {
      const page = findOwner(ctx, a.node_id, a.page);
      const at = locate(page, a.node_id)!;
      const next = at.kind === "section" ? moveSection(page, a.node_id, a.index) : at.kind === "node" ? moveNode(page, a.node_id, a.to_section_id ?? at.section.id, a.index) : fail("Overlays have no order to move within; change their anchor in the editor.");
      return { site: withPage(ctx.site, next), text: `Moved ${a.node_id}.`, summary: `Move ${at.kind} on ${page.title}`, changed: [a.node_id] };
    },
  ),

  tool("delete_node", "Delete a node, a section (with everything in it) or an overlay from a page. Alex can undo it in the editor.", z.object({ page: PageRef, node_id: z.string() }), (a, ctx) => {
    const page = findOwner(ctx, a.node_id, a.page);
    const at = locate(page, a.node_id)!;
    return { site: withPage(ctx.site, remove(page, a.node_id)), text: `Deleted ${at.kind} ${a.node_id}.`, summary: `Delete ${at.kind} on ${page.title}` };
  }),

  tool(
    "set_responsive_override",
    'Set or reset per-breakpoint values. The base is mobile (390px); tablet (834px, 600–899px screens) and desktop (1440px, 900px and up) store only what differs from mobile; widescreen (1920px, 1600px and up) stores only what differs from desktop. breakpoint "mobile" writes the base, any other writes that size\'s overrides. Pass null for a key to reset it (on tablet and desktop: back to the mobile value; on widescreen: back to the desktop value). Free-layout boxes (x, y, w, h) and section height are in that size\'s own design pixels.',
    z.object({
      page: PageRef,
      node_id: z.string(),
      breakpoint: z.enum(["mobile", "tablet", "desktop", "widescreen"]),
      style: z.record(z.string(), z.unknown()).optional().describe("Style keys → value, or null to reset. Same keys as update_node.style."),
      layout: z.record(z.string(), z.unknown()).optional().describe("Sections only: layout keys → value, or null to reset."),
      frame: z.record(z.string(), z.unknown()).optional().describe("Media nodes: frame-fit keys → value, or null to reset."),
    }),
    (a, ctx) => {
      const page = findOwner(ctx, a.node_id, a.page);
      const at = locate(page, a.node_id)!;
      const patch = <T extends object>(r: Responsive<T>, values: Record<string, unknown> | undefined, schema: z.ZodType) => {
        if (!values) return r;
        let next = r;
        for (const [key, value] of Object.entries(values)) {
          if (value === null) next = setAt(next, a.breakpoint, { [key]: undefined } as Partial<T>);
          else {
            const ok = schema.safeParse({ [key]: value });
            if (!ok.success) fail(`Invalid ${key}: ${ok.error.issues[0]!.message}`);
            next = setAt(next, a.breakpoint, { [key]: value } as Partial<T>);
          }
        }
        return next;
      };
      const next =
        at.kind === "section"
          ? updateSection(page, a.node_id, (s) => ({ ...s, layout: patch(s.layout, a.layout ?? a.style, SectionLayout.partial()) }))
          : updateNode(page, at.node.id, (n) => ({ ...n, style: patch(n.style, a.style, Style.partial()), ...(a.frame ? { frame: patch(n.frame ?? { base: { fit: "fill" as const, focalX: 50, focalY: 50, zoom: 1, panX: 0, panY: 0 } }, a.frame, FrameFit.partial()) } : {}) }));
      return { site: withPage(ctx.site, next), text: `Set ${a.breakpoint} values on ${a.node_id}.`, summary: `Set ${a.breakpoint} layout on ${page.title}`, changed: [a.node_id] };
    },
  ),

  tool(
    "create_page",
    "Create a page (as a draft) from a template: blank, gallery, diary, playlist, or a saved page template id. Returns its id and URL.",
    z.object({ name: z.string().min(1), template: z.string().optional(), parent: z.string().optional().describe("Parent page id to nest under (one level deep)."), show_in_nav: z.boolean().optional().describe("Default true."), slug: z.string().optional().describe("Last part of the URL. Default: made from the name.") }),
    (a, ctx) => {
      const r = createPage(ctx.site, { name: a.name, templateId: a.template, parentId: a.parent, showInNav: a.show_in_nav, slug: a.slug });
      const page = r.site.pages.find((p) => p.id === r.pageId)!;
      return { site: r.site, text: json(pageSummary(page)), summary: `Create page ${page.title}` };
    },
  ),

  tool(
    "update_page_settings",
    "Change a page's settings: title, URL (the old URL gets a redirect and sub-pages follow), status (published | draft | unlisted), search/share fields, whether it shows in the nav, and its parent.",
    z.object({
      page: z.string().describe("Page id or URL path."),
      title: z.string().optional(),
      slug: z.string().optional().describe("New last part of the URL."),
      status: z.enum(["published", "draft", "unlisted"]).optional(),
      seo: z.object({ title: z.string().optional(), description: z.string().optional(), image: z.string().optional() }).optional(),
      show_in_nav: z.boolean().optional(),
      hide_nav: z.boolean().optional().describe("true leaves the site navigation off this page (the homepage brings its own header)."),
      parent: z.string().nullable().optional().describe("Parent page id, or null for top level."),
    }),
    (a, ctx) => {
      const id = findPage(ctx, a.page).id;
      let site = ctx.site;
      if (a.title !== undefined) site = renamePage(site, id, a.title);
      if (a.parent !== undefined) site = setParent(site, id, a.parent);
      if (a.slug !== undefined) site = setSlug(site, id, a.slug);
      if (a.status !== undefined) site = setStatus(site, id, a.status);
      if (a.seo) site = setSeo(site, id, a.seo);
      if (a.show_in_nav !== undefined) site = setShowInNav(site, id, a.show_in_nav);
      if (a.hide_nav !== undefined) site = { ...site, pages: site.pages.map((p) => (p.id === id ? { ...p, hideNav: a.hide_nav || undefined } : p)) };
      const page = site.pages.find((p) => p.id === id)!;
      return { site, text: json({ ...pageSummary(page), redirects: site.redirects.filter((r) => r.to === page.slug) }), summary: `Update settings of ${page.title}` };
    },
  ),

  tool(
    "update_nav",
    `Edit the navigation. Do one or more of: add an item (types: ${NAV_ITEM_TYPES.join(", ")}), update an item's settings by id, move it, remove it, or change nav behaviour. Item ids come from get_site → nav.items.`,
    z.object({
      add: z.object({ type: z.enum(NAV_ITEM_TYPES), parent_id: z.string().optional().describe("Add inside this manual dropdown."), label: z.string().optional(), target: LinkTarget.optional() }).optional(),
      update: z
        .object({
          id: z.string(),
          label: z.string().optional(),
          target: LinkTarget.optional(),
          icon: z.object({ name: z.string(), position: z.enum(["none", "left", "right"]) }).optional(),
          badge: z.object({ text: z.string(), expires: z.string().optional().describe("YYYY-MM-DD") }).nullable().optional(),
          show_on: z.enum(["both", "desktop", "mobile"]).optional(),
          hover: z.enum(["tint", "underline", "none"]).optional(),
          new_tab: z.boolean().optional(),
          aria_label: z.string().optional(),
          variant: z.enum(["filled", "outline"]).optional(),
          code: z.string().optional(),
        })
        .optional(),
      move: z.object({ id: z.string(), delta: z.union([z.literal(-1), z.literal(1)]) }).optional(),
      remove: z.string().optional().describe("Item id to remove."),
      behaviour: z.object({ hide_on_scroll: z.boolean().optional(), current_marker: z.enum(["pill", "underline", "none"]).optional(), logo_text: z.string().optional() }).optional(),
    }),
    (a, ctx) => {
      let site = ctx.site;
      const done: string[] = [];
      if (a.add) {
        const r = addNavItem(site, a.add.type, a.add.parent_id);
        site = updateNavItem(r.site, r.itemId, { ...(a.add.label !== undefined ? { label: a.add.label } : {}), ...(a.add.target ? { target: a.add.target } : {}) });
        done.push(`added ${NAV_TYPE_LABELS[a.add.type]} (id ${r.itemId})`);
      }
      if (a.update) {
        const u = a.update;
        if (!findNavItem(site.nav.items, u.id)) fail(`No nav item "${u.id}".`);
        const patch: Record<string, unknown> = {};
        if (u.label !== undefined) patch.label = u.label;
        if (u.target) patch.target = u.target;
        if (u.icon) patch.icon = u.icon.position === "none" ? undefined : u.icon;
        if (u.badge !== undefined) patch.badge = u.badge ?? undefined;
        if (u.show_on) patch.showOn = u.show_on;
        if (u.hover) patch.hover = u.hover;
        if (u.new_tab !== undefined) patch.newTab = u.new_tab || undefined;
        if (u.aria_label !== undefined) patch.ariaLabel = u.aria_label;
        if (u.variant) patch.variant = u.variant;
        if (u.code !== undefined) patch.code = u.code;
        site = updateNavItem(site, u.id, patch);
        done.push(`updated ${u.id}`);
      }
      if (a.move) {
        site = moveNavItem(site, a.move.id, a.move.delta);
        done.push(`moved ${a.move.id}`);
      }
      if (a.remove) {
        site = removeNavItem(site, a.remove);
        done.push(`removed ${a.remove}`);
      }
      if (a.behaviour) {
        const b = a.behaviour;
        site = setNavBehaviour(site, { ...(b.hide_on_scroll !== undefined ? { hideOnScroll: b.hide_on_scroll } : {}), ...(b.current_marker ? { currentMarker: b.current_marker } : {}), ...(b.logo_text ? { logoText: b.logo_text } : {}) });
        done.push("changed behaviour");
      }
      if (!done.length) fail("Nothing to do: pass add, update, move, remove or behaviour.");
      return { site, text: `Navigation: ${done.join("; ")}.`, summary: `Update the navigation (${done.join(", ")})` };
    },
  ),

  // The three tools below need the Worker (network, R2, an open editor, GitHub); it supplies their behaviour.
  tool(
    "upload_media_from_url",
    "Copy an image, video, audio file, font, PDF, Lottie .json or .glb from a public https URL into the site's media library (R2). Returns the /media/... URL to use as a component's src.",
    z.object({ url: z.string().url(), name: z.string().optional().describe("File name to store it under, with extension. Default: taken from the URL.") }),
  ),
  tool(
    "get_preview_screenshot",
    "Get a PNG screenshot of a draft page as it renders at a breakpoint (mobile 390px, tablet 834px, desktop 1440px or widescreen 1920px wide). Use it to check your changes.",
    z.object({ page: PageRef, breakpoint: z.enum(["mobile", "tablet", "desktop", "widescreen"]).default("mobile") }),
  ),
  tool(
    "publish",
    "Publish the draft to the live site. ONLY call this when Alex has explicitly asked, in this chat, to publish (for example \"publish it\" or \"make it live\"). Never publish on your own initiative, as a final step, or because edits look finished: every other tool only changes the draft, and Alex decides when it goes live.",
    z.object({ message: z.string().optional().describe("Short description of what changed, for the version history.") }),
  ),
];

function applyNodePatch(n: Node, a: { content?: Record<string, unknown>; style?: unknown; frame?: unknown; effects?: Node["effects"]; name?: string; locked?: boolean }): Node {
  const content = a.content ? { ...n.content, ...a.content } : n.content;
  const def = getComponent(n.type);
  if (a.content && def) {
    const checked = def.schema.safeParse(content);
    if (!checked.success) fail(`Invalid content for ${n.type}: ${checked.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  return {
    ...n,
    content,
    name: a.name ?? n.name,
    locked: a.locked === undefined ? n.locked : a.locked || undefined,
    style: a.style ? setAt(n.style, "mobile", a.style as Partial<Style>) : n.style,
    ...(a.frame ? { frame: setAt(n.frame ?? { base: { fit: "fill" as const, focalX: 50, focalY: 50, zoom: 1, panX: 0, panY: 0 } }, "mobile", a.frame as Partial<FrameFit>) } : {}),
    ...(a.effects ? { effects: { ...n.effects, ...a.effects } } : {}),
  };
}

export const toolByName = (name: string) => tools.find((t) => t.name === name);

/** Run a pure tool. Bad input and tool errors come back as text for Claude to read and correct. */
export function runTool(name: string, rawArgs: unknown, ctx: ToolContext): ToolResult & { isError?: boolean } {
  const t = toolByName(name);
  if (!t) return { text: `Unknown tool "${name}".`, isError: true };
  const parsed = t.input.safeParse(rawArgs ?? {});
  if (!parsed.success) return { text: `Invalid arguments: ${parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ")}`, isError: true };
  if (!t.run) return { text: `${name} is handled by the server.`, isError: true };
  try {
    return t.run(parsed.data, ctx);
  } catch (e) {
    if (e instanceof ToolError) return { text: e.message, isError: true };
    throw e;
  }
}
