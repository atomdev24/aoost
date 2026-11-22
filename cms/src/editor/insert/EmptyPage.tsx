import { useState } from "react";
import { instantiate } from "../../model/library";
import { isCancelled, uploadFile } from "../media";
import { MEDIA_MIME, placeMedia, type DraggedMedia } from "../canvas/drops";
import { currentPage, getState, updatePage, useEditor } from "../store";
import { BUILTIN_STARTERS, isEmptyPage } from "./page-templates";
import { Thumb } from "./thumbs";

const dismissed = new Set<string>();

/**
 * A new, empty page: "Start from" with template cards (Blank, Journal entry,
 * Gallery page and any saved page templates), and a muted line about "/" and
 * dropping an image. Shown over the active frame until the page has a block.
 */
export function EmptyPage({ rect }: { rect: { left: number; top: number; width: number; height: number } }) {
  const page = useEditor(currentPage);
  const templates = useEditor((s) => s.site.templates).filter((t) => t.kind === "page" && t.id !== "blank");
  const [, force] = useState(0);
  const [over, setOver] = useState(false);
  if (!isEmptyPage(page) || dismissed.has(page.id)) return null;
  const start = (sections: (title: string) => import("../../schema").Section[], name: string) => updatePage(getState().pageId, (p) => ({ ...p, sections: sections(p.title) }), `Start from ${name}`);
  const top = rect.top + Math.min(rect.height * 0.3, Math.max(48, rect.height * 0.22));
  return (
    <div
      className={`ed-start${over ? " is-over" : ""}`}
      style={{ left: rect.left + rect.width / 2, top }}
      role="region"
      aria-label="Start this page"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files") && !e.dataTransfer.types.includes(MEDIA_MIME)) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setOver(false);
        const media = e.dataTransfer.getData(MEDIA_MIME);
        if (media) return void placeMedia(null, JSON.parse(media) as DraggedMedia);
        const file = [...e.dataTransfer.files].find((f) => /^image\//.test(f.type));
        if (file) await uploadFile(file).then((item) => placeMedia(null, item), (err) => void (isCancelled(err) || console.warn(err)));
      }}
    >
      <strong className="ed-start-title">Start from</strong>
      <div className="ed-start-cards">
        <button
          type="button"
          className="ed-card"
          onClick={() => {
            dismissed.add(page.id);
            force((n) => n + 1);
          }}
        >
          <Thumb type="FlowSection" />
          <span className="ed-card-name">Blank</span>
        </button>
        {BUILTIN_STARTERS.map((t) => (
          <button key={t.id} type="button" className="ed-card" title={t.hint} onClick={() => start(t.sections, t.name)}>
            <Thumb type={t.id === "gallery-page" ? "GalleryGrid" : "Text"} />
            <span className="ed-card-name">{t.name}</span>
          </button>
        ))}
        {templates.map((t) => (
          <button key={t.id} type="button" className="ed-card" title={`Saved template · ${t.sections.length} ${t.sections.length === 1 ? "section" : "sections"}`} onClick={() => start(() => instantiate(t.sections), t.name)}>
            <Thumb saved />
            <span className="ed-card-name">{t.name}</span>
          </button>
        ))}
      </div>
      <p className="ed-start-hint">Press / to add a block, or drop an image</p>
    </div>
  );
}
