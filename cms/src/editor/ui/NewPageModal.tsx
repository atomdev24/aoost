import { useId, useState } from "react";
import { createPage, slugify } from "../../model/pages";
import { getState, setPage, update, useEditor } from "../store";
import { Button, Modal } from "./kit";

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
  const [parentId, setParentId] = useState("");
  const uid = useId();

  const parent = pages.find((p) => p.id === parentId);
  const preview = `${parent ? parent.slug : ""}/${slugify(name)}`;
  const create = () => {
    if (!name.trim()) return;
    let made = "";
    update((site) => {
      const result = createPage(site, { name, templateId, showInNav, parentId: parentId || null });
      made = result.pageId;
      return result.site;
    }, `New page ${name.trim()}`);
    if (made && getState().site.pages.some((p) => p.id === made)) setPage(made);
    onClose();
  };

  return (
    <Modal title="New page" onClose={onClose}>
      <form
        className="ed-form"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <div className="ed-field">
          <label className="ed-field-label ed-field-label-lg" htmlFor={`${uid}-name`}>
            Page name
          </label>
          <input id={`${uid}-name`} className="ed-input ed-input-lg" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sketchbook" autoFocus />
          <span className="ed-hint">URL: alexoostendurp.com{preview}</span>
        </div>

        <div className="ed-field">
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
          <label className="ed-check">
            <input type="checkbox" checked={showInNav} onChange={(e) => setShowInNav(e.target.checked)} />
            Show in navigation
          </label>
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
            Create page
          </Button>
        </div>
      </form>
    </Modal>
  );
}
