import { useEffect, useRef, useState } from "react";
import { deletePage, duplicatePage, renamePage, reorderPage, setParent, setSeo, setSlug, setStatus } from "../../model/pages";
import type { Page } from "../../schema";
import { MediaInput } from "../fields/media";
import { currentPage, getState, megaItemId, setPage, update, useEditor } from "../store";
import { Button, Select, TextInput, Toggle } from "./kit";
import { NavPanel } from "./NavPanel";

/**
 * Page settings: rename, URL with automatic redirect, status, search & share, duplicate, delete.
 * Shown inside the Pages flyout via the "Page settings" action.
 */
export function PageSettings({ targetPageId, onBack }: { targetPageId?: string; onBack?: () => void } = {}) {
  const current = useEditor(currentPage);
  const pages = useEditor((s) => s.site.pages);
  const page = targetPageId ? (pages.find((p) => p.id === targetPageId) ?? current) : current;
  const patch = (fields: Partial<Page>, label: string) => update((s) => ({ ...s, pages: s.pages.map((p) => (p.id === page.id ? (Object.fromEntries(Object.entries({ ...p, ...fields }).filter(([, v]) => v !== undefined)) as Page) : p)) }), label);
  const editingMenu = !!megaItemId(page.id);
  const redirects = useEditor((s) => s.site.redirects);
  const siteTitle = useEditor((s) => s.site.settings.title);
  const [seoOpen, setSeoOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // The URL the page had when it was opened, to explain the redirect being created.
  const original = useRef({ id: page.id, slug: page.slug });
  if (original.current.id !== page.id) original.current = { id: page.id, slug: page.slug };
  useEffect(() => setConfirming(false), [page.id]);

  const prefix = page.slug.split("/").slice(0, -1).join("/");
  const segment = page.slug.split("/").pop() ?? "";
  const movedFrom = redirects.find((r) => r.to === page.slug && r.from === original.current.slug)?.from;
  const children = pages.filter((p) => p.parentId === page.id);
  const canNest = !page.isHome && !children.length;

  if (editingMenu) {
    return (
      <div className="ed-side">
        <header className="ed-side-head">
          {onBack ? (
            <button type="button" className="ed-mini ed-back-btn" onClick={onBack} aria-label="Back to pages" title="Back to pages">
              ←
            </button>
          ) : null}
          <div>
            <h3>Menu panel</h3>
            <span>{page.title}</span>
          </div>
        </header>
        <div className="ed-side-body">
          <p className="ed-hint">This panel opens under the nav item. Build it like a page: add sections and drop in links, images, video or embeds. On phones its columns stack inside the menu.</p>
        </div>
        <NavPanel />
      </div>
    );
  }

  return (
    <div className="ed-side">
      <header className="ed-side-head">
        {onBack ? (
          <button type="button" className="ed-mini ed-back-btn" onClick={onBack} aria-label="Back to pages" title="Back to pages">
            ←
          </button>
        ) : null}
        <div>
          <h3>Page settings</h3>
          <span>{page.title}</span>
        </div>
      </header>
      <div className="ed-side-body">
        <label className="ed-field">
          <span className="ed-field-label">Name (also the nav label)</span>
          <TextInput value={page.title} onCommit={(title) => update((s) => renamePage(s, page.id, title), `Rename page to ${title}`)} />
        </label>

        {page.isHome ? null : (
          <div className="ed-field">
            <label className="ed-field-label" htmlFor="ps-slug">
              URL
            </label>
            <div className="ed-url">
              <span>{prefix}/</span>
              <TextInput id="ps-slug" value={segment} onCommit={(v) => v && update((s) => setSlug(s, page.id, v), "Change page URL")} />
            </div>
            {movedFrom ? <span className="ed-note">{movedFrom} will redirect here, so old links keep working.</span> : null}
          </div>
        )}

        <label className="ed-field">
          <span className="ed-field-label">Status</span>
          <Select<Page["status"]>
            value={page.status}
            options={[
              { value: "published", label: "Published" },
              { value: "draft", label: "Draft, only you can see it" },
              { value: "unlisted", label: "Unlisted, live by link only" },
            ]}
            onChange={(status) => status && update((s) => setStatus(s, page.id, status), `Set ${page.title} to ${status}`)}
          />
        </label>

        {page.isHome ? null : (
          <label className="ed-field">
            <span className="ed-field-label">Page type</span>
            <Select<"page" | "campaign" | "post">
              value={page.kind ?? "page"}
              options={[
                { value: "page", label: "Page" },
                { value: "campaign", label: "Campaign page (link only, can end on a date)" },
                { value: "post", label: "Blog post" },
              ]}
              onChange={(kind) =>
                kind &&
                patch(
                  {
                    kind: kind === "page" ? undefined : kind,
                    ...(kind === "post" && !page.post ? { post: { date: new Date().toISOString().slice(0, 10) } } : {}),
                    ...(kind !== "page" ? { showInNav: false } : {}),
                  },
                  `Make ${page.title} a ${kind === "post" ? "blog post" : kind === "campaign" ? "campaign page" : "page"}`,
                )
              }
            />
          </label>
        )}

        {page.kind === "campaign" ? (
          <label className="ed-field">
            <span className="ed-field-label">Take it down after</span>
            <input type="date" className="ed-input" value={page.unpublishAt ?? ""} onChange={(e) => patch({ unpublishAt: e.target.value || undefined }, "Set the campaign end date")} />
            <span className="ed-hint">{page.unpublishAt ? `From the day after, the link shows the "not found" page.` : "Leave empty to keep it up."}</span>
          </label>
        ) : null}

        {page.kind === "post" && page.post ? (
          <>
            <label className="ed-field">
              <span className="ed-field-label">Post date</span>
              <input type="date" className="ed-input" value={page.post.date} onChange={(e) => e.target.value && patch({ post: { ...page.post!, date: e.target.value } }, "Set the post date")} />
            </label>
            <div className="ed-field">
              <span className="ed-field-label">Cover picture</span>
              <MediaInput kind="image" label="Cover picture" value={page.post.cover} onChange={(cover) => patch({ post: { ...page.post!, cover: cover || undefined } }, "Set the post cover")} />
            </div>
            <label className="ed-field">
              <span className="ed-field-label">Summary (shown in the blog list)</span>
              <TextInput value={page.post.excerpt ?? ""} placeholder="One sentence" onCommit={(excerpt) => patch({ post: { ...page.post!, excerpt: excerpt || undefined } }, "Edit the post summary")} />
            </label>
          </>
        ) : null}

        {page.isHome ? null : (
          <label className="ed-field">
            <span className="ed-field-label">Place it</span>
            <Select
              value={page.parentId ?? ""}
              options={[{ value: "", label: "Top level" }, ...(canNest ? pages.filter((p) => !p.parentId && !p.isHome && p.id !== page.id).map((p) => ({ value: p.id, label: `Under ${p.title}` })) : [])]}
              onChange={(parentId) => update((s) => setParent(s, page.id, parentId || null), `Move ${page.title}`)}
            />
            {!canNest && children.length ? <span className="ed-hint">This page has sub-pages, so it stays at the top level.</span> : null}
          </label>
        )}

        <div className="ed-row">
          <span className="ed-label">Site navigation on this page</span>
          <div className="ed-control">
            <Toggle label="Site navigation on this page" checked={!page.hideNav} onChange={(show) => update((s) => ({ ...s, pages: s.pages.map((p) => (p.id === page.id ? { ...p, hideNav: show ? undefined : true } : p)) }), show ? "Show the nav on this page" : "Hide the nav on this page")} />
          </div>
        </div>

        <button type="button" className="ed-disclosure" aria-expanded={seoOpen} onClick={() => setSeoOpen(!seoOpen)}>
          Search &amp; share <span>Title, description, image</span>
        </button>
        {seoOpen ? (
          <div className="ed-seo">
            <div className="ed-serp" aria-hidden="true">
              <span>alexoostendurp.com{page.slug === "/" ? "" : page.slug}</span>
              <strong>{page.seo.title || (page.isHome ? siteTitle : `${page.title} · ${siteTitle}`)}</strong>
              <p>{page.seo.description || "Add a description so search results and link previews say what this page is."}</p>
            </div>
            <label className="ed-field">
              <span className="ed-field-label">Title</span>
              <TextInput value={page.seo.title ?? ""} placeholder={page.isHome ? siteTitle : `${page.title} · ${siteTitle}`} onCommit={(title) => update((s) => setSeo(s, page.id, { title }), "Edit search title")} />
            </label>
            <label className="ed-field">
              <span className="ed-field-label">Description</span>
              <TextInput value={page.seo.description ?? ""} placeholder="One or two sentences" onCommit={(description) => update((s) => setSeo(s, page.id, { description }), "Edit search description")} />
            </label>
            <div className="ed-field">
              <span className="ed-field-label">Share image</span>
              <MediaInput kind="image" label="Share image" value={page.seo.image} onChange={(image) => update((s) => setSeo(s, page.id, { image }), "Edit share image")} />
            </div>
          </div>
        ) : null}

        {page.isHome ? null : (
          <div className="ed-two">
            <Button onClick={() => update((s) => reorderPage(s, page.id, -1), `Move ${page.title} up`)}>Move up</Button>
            <Button onClick={() => update((s) => reorderPage(s, page.id, 1), `Move ${page.title} down`)}>Move down</Button>
          </div>
        )}
        <div className="ed-two">
          <Button
            onClick={() => {
              let made = "";
              update((s) => {
                const result = duplicatePage(s, page.id);
                made = result?.pageId ?? "";
                return result?.site ?? s;
              }, `Duplicate ${page.title}`);
              if (made) setPage(made);
            }}
          >
            Duplicate
          </Button>
          <Button
            variant={confirming ? "danger" : "ghost"}
            disabled={page.isHome}
            title={page.isHome ? "The home page can't be deleted" : children.length ? `Also deletes ${children.length} sub-page${children.length === 1 ? "" : "s"}` : undefined}
            onClick={() => {
              if (!confirming) return setConfirming(true);
              const home = getState().site.pages.find((p) => p.isHome);
              update((s) => deletePage(s, page.id), `Delete ${page.title}`);
              if (home) setPage(home.id);
              setConfirming(false);
              onBack?.();
            }}
          >
            {confirming ? "Click again to delete" : "Delete"}
          </Button>
        </div>
        {confirming ? (
          <p className="ed-note">
            Deletes {page.title}
            {children.length ? ` and its ${children.length} sub-page${children.length === 1 ? "" : "s"}` : ""}, removes it from the nav, and redirects its URL to the home page.
          </p>
        ) : null}
      </div>
      <NavPanel />
    </div>
  );
}
