import { useId, useState } from "react";
import { createPage, slugify } from "../../model/pages";
import { getState, setPage, update, useEditor } from "../store";
import { Button, Modal } from "./kit";
import { openWriter } from "../writer/writer-open";

/** Thumbnails for the starter templates (same language as the mockup). */
const THUMBS: Record<string, string> = {
  blank: "none",
  gallery: "linear-gradient(90deg, #3A3A40 0 30%, transparent 30% 35%, #3A3A40 35% 65%, transparent 65% 70%, #3A3A40 70%)",
  diary: "linear-gradient(180deg, #3A3A40 0 40%, transparent 40% 52%, #33333A 52% 60%, transparent 60% 70%, #33333A 70% 78%, transparent 78%)",
  playlist: "linear-gradient(180deg, #E2683A 0 26%, transparent 26% 38%, #3A3A40 38% 50%, transparent 50% 62%, #3A3A40 62% 74%, transparent 74%)",
};
const CUSTOM_THUMB = "linear-gradient(180deg, #3A3A40 0 22%, transparent 22% 34%, #33333A 34% 100%)";

/** New page: name → automatic URL, a template, "show in navigation" and "place it". */
export function NewPageModal({ onClose }: { onClose: () => void }) {
  const pages = useEditor((s) => s.site.pages);
  const templates = useEditor((s) => s.site.templates).filter((t) => t.kind === "page");
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("blank");
  const [showInNav, setShowInNav] = useState(true);
  const [kind, setKind] = useState<"page" | "campaign" | "post">("page");
  const blog = pages.find((p) => p.id === "blog" || p.slug === "/blog");
  const [parentId, setParentId] = useState("");
  const [unpublishAt, setUnpublishAt] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const uid = useId();
  const pickKind = (k: typeof kind) => {
    setKind(k);
    // Posts go under the blog page when there is one.
    if (k === "post" && blog && !parentId) setParentId(blog.id);
  };

  const parent = pages.find((p) => p.id === parentId);
  const preview = `${parent ? parent.slug : ""}/${slugify(name)}`;
  const create = () => {
    if (!name.trim()) return;
    let made = "";
    update((site) => {
      const result = createPage(site, { name, templateId, showInNav: kind === "page" && showInNav, parentId: parentId || null, kind, unpublishAt: unpublishAt || undefined, date });
      made = result.pageId;
      return result.site;
    }, `${kind === "post" ? "New blog post" : kind === "campaign" ? "New campaign page" : "New page"} ${name.trim()}`);
    if (made && getState().site.pages.some((p) => p.id === made)) {
      setPage(made);
      if (kind === "post") openWriter(made);
    }
    onClose();
  };

  return (
    <Modal title={kind === "post" ? "New blog post" : kind === "campaign" ? "New campaign page" : "New page"} onClose={onClose}>
      <form
        className="ed-form"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <div className="ed-field">
          <span className="ed-field-label ed-field-label-lg">What are you making?</span>
          <div className="ed-kinds" role="radiogroup" aria-label="Page type">
            {(
              [
                ["page", "Page", "A permanent page, like a product page"],
                ["campaign", "Campaign page", "For an event or email: link only, can end on a date"],
                ["post", "Blog post", "Write it like a doc; the template lays it out"],
              ] as const
            ).map(([k, label, hint]) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => pickKind(k)}>
                <strong>{label}</strong>
                <span>{hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ed-field">
          <label className="ed-field-label ed-field-label-lg" htmlFor={`${uid}-name`}>
            {kind === "post" ? "Post title" : "Page name"}
          </label>
          <input id={`${uid}-name`} className="ed-input ed-input-lg" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sketchbook" autoFocus />
          <span className="ed-hint">URL: alexoostendurp.com{preview}</span>
        </div>

        {kind === "campaign" ? (
          <div className="ed-field">
            <label className="ed-field-label ed-field-label-lg" htmlFor={`${uid}-end`}>
              Take it down after (optional)
            </label>
            <input id={`${uid}-end`} type="date" className="ed-input ed-input-lg" value={unpublishAt} onChange={(e) => setUnpublishAt(e.target.value)} />
            <span className="ed-hint">After this day the link shows the site's "not found" page. Campaign pages never show in the nav or search.</span>
          </div>
        ) : null}
        {kind === "post" ? (
          <div className="ed-field">
            <label className="ed-field-label ed-field-label-lg" htmlFor={`${uid}-date`}>
              Post date
            </label>
            <input id={`${uid}-date`} type="date" className="ed-input ed-input-lg" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        ) : null}

        <div className="ed-field" hidden={kind === "post"}>
          <span className="ed-field-label ed-field-label-lg">Start from</span>
          <div className="ed-templates">
            {templates.map((t) => (
              <button key={t.id} type="button" aria-pressed={t.id === templateId} onClick={() => setTemplateId(t.id)}>
                <span className="ed-template-thumb" style={{ backgroundImage: THUMBS[t.id] ?? CUSTOM_THUMB }} />
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ed-form-two">
          {kind === "page" ? (
            <label className="ed-check">
              <input type="checkbox" checked={showInNav} onChange={(e) => setShowInNav(e.target.checked)} />
              Show in navigation
            </label>
          ) : (
            <span className="ed-hint">{kind === "post" ? "Posts show in the blog list, not the nav." : "Reached by link only."}</span>
          )}
          <div className="ed-field">
            <label className="ed-field-label ed-field-label-lg" htmlFor={`${uid}-parent`}>
              Place it
            </label>
            <select id={`${uid}-parent`} className="ed-input ed-input-lg" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">Top level</option>
              {pages
                .filter((p) => !p.parentId && !p.isHome)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    Under {p.title}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="ed-form-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="accent" disabled={!name.trim()}>
            {kind === "post" ? "Start writing" : "Create page"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
