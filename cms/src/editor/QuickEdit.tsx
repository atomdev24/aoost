import { useState } from "react";
import { getComponent } from "../components/registry";
import { updateNode } from "../model/page-ops";
import { newId, type DiaryEntry, type Node, type Playlist, type Site } from "../schema";
import { api, ApiError } from "./api";
import { MediaInput } from "./fields/media";
import { currentPage, flush, setPage, setUnpublished, undo, update, updatePage, useEditor } from "./store";
import { MediaPickerHost } from "./ui/MediaPicker";
import { SyncNotice } from "./workspace/SyncNotice";
import "./quick.css";

/**
 * Quick edit: the editor on a phone (SPEC §4). Swap text and images, add a
 * diary entry or a playlist, and publish. Layout work (drag, canvas, frames)
 * stays on the desktop editor.
 */
type Tab = "page" | "diary" | "playlists";
const today = () => new Date().toISOString().slice(0, 10);
const setCollections = (fn: (c: Site["collections"]) => Site["collections"], label: string, merge?: string) => update((s) => ({ ...s, collections: fn(s.collections) }), label, { merge });

export function QuickEdit() {
  const [tab, setTab] = useState<Tab>("page");
  const save = useEditor((s) => s.save);
  const saveError = useEditor((s) => s.saveError);
  const unpublished = useEditor((s) => s.unpublished);
  const canUndo = useEditor((s) => s.past.length > 0);
  const page = useEditor(currentPage);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const publish = async () => {
    setPublishing(true);
    setNotice(null);
    try {
      if (!(await flush())) throw new Error("Fix the save error first.");
      const result = await api.publish();
      setUnpublished(false);
      setNotice(result.commit ? "Published. Live in about a minute." : "Nothing new to publish.");
    } catch (e) {
      setNotice(e instanceof ApiError || e instanceof Error ? e.message : "Publishing failed.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="qe">
      <MediaPickerHost />
      <SyncNotice />
      <header className="qe-top">
        <div className="qe-brand">
          <strong>aoost</strong>
          <span>Quick edit</span>
        </div>
        <button type="button" className="ed-icon" onClick={undo} disabled={!canUndo} aria-label="Undo">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 3L2 6l3 3M2 6h7.500a4 4 0 0 1 0 8H7" />
          </svg>
        </button>
        <button type="button" className="ed-btn ed-btn-accent" onClick={publish} disabled={publishing || (!unpublished && save !== "error")}>
          {publishing ? "Publishing…" : "Publish"}
        </button>
      </header>
      <p className={`qe-status${save === "error" ? " is-error" : ""}`} role="status">
        {notice ?? (save === "error" ? `Not saved: ${saveError}` : save === "saving" ? "Saving…" : unpublished ? "Unpublished changes (saved as a draft)" : "All changes published")}
      </p>

      <nav className="qe-tabs" role="tablist" aria-label="Quick edit">
        {(["page", "diary", "playlists"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t === "page" ? "Page" : t === "diary" ? "Diary" : "Playlists"}
          </button>
        ))}
      </nav>

      <main className="qe-main">
        {tab === "page" ? <PageTab /> : tab === "diary" ? <DiaryTab /> : <PlaylistsTab />}
      </main>

      <footer className="qe-foot">
        <a className="ed-btn ed-btn-ghost" href={`/preview${page.slug === "/" ? "/" : page.slug}`} target="aoost-preview" onClick={() => void flush()}>
          Preview this page
        </a>
        <p>Layout, sections and the nav are edited on a bigger screen.</p>
      </footer>
    </div>
  );
}

// ----------------------------------------------------------------- page

function PageTab() {
  const pages = useEditor((s) => s.site.pages);
  const page = useEditor(currentPage);
  const editable = page.sections.flatMap((s) => s.children.filter((n) => ["Text", "Image", "Button", "Video"].includes(n.type)).map((node) => ({ node, section: s })));
  const other = page.sections.flatMap((s) => s.children).filter((n) => !["Text", "Image", "Button", "Video", "Spacer", "Divider"].includes(n.type));

  return (
    <>
      <label className="qe-field">
        <span>Page</span>
        <select className="ed-input qe-input" value={page.id} onChange={(e) => setPage(e.target.value)}>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.parentId ? "— " : ""}
              {p.title}
              {p.status !== "published" ? ` (${p.status})` : ""}
            </option>
          ))}
        </select>
      </label>
      {editable.map(({ node, section }) => (
        <NodeCard key={node.id} node={node} sectionName={section.name} pageId={page.id} />
      ))}
      {!editable.length ? <p className="qe-empty">No text or images on this page yet.</p> : null}
      {other.length ? <p className="qe-empty">Also on this page: {[...new Set(other.map((n) => getComponent(n.type)?.label ?? n.type))].join(", ")}. Edit those on a bigger screen.</p> : null}
    </>
  );
}

function NodeCard({ node, sectionName, pageId }: { node: Node; sectionName?: string; pageId: string }) {
  const set = (patch: Record<string, unknown>, label: string) => updatePage(pageId, (p) => updateNode(p, node.id, (n) => ({ ...n, content: { ...n.content, ...patch } })), label, { merge: `quick:${node.id}:${Object.keys(patch).join()}` });
  const c = node.content as Record<string, string | undefined>;
  return (
    <section className="qe-card">
      <h3>
        {node.name ?? getComponent(node.type)?.label ?? node.type}
        {sectionName ? <span> · {sectionName}</span> : null}
      </h3>
      {node.type === "Text" ? <textarea className="ed-input qe-input qe-text" rows={Math.min(8, Math.max(2, Math.ceil((c.text ?? "").length / 34)))} value={c.text ?? ""} aria-label="Text" onChange={(e) => set({ text: e.target.value }, "Edit text")} /> : null}
      {node.type === "Image" ? (
        <>
          <MediaInput kind="image" label="Image" value={c.src} onChange={(src) => set({ src }, "Swap image")} />
          <input className="ed-input qe-input" value={c.alt ?? ""} placeholder="Describe the image (alt text)" aria-label="Alt text" onChange={(e) => set({ alt: e.target.value }, "Edit alt text")} />
        </>
      ) : null}
      {node.type === "Video" ? <MediaInput kind="image" label="Poster image" value={c.poster} onChange={(poster) => set({ poster }, "Swap poster")} /> : null}
      {node.type === "Button" ? <input className="ed-input qe-input" value={c.label ?? ""} aria-label="Button label" onChange={(e) => e.target.value && set({ label: e.target.value }, "Edit button label")} /> : null}
    </section>
  );
}

// ---------------------------------------------------------------- diary

function DiaryTab() {
  const entries = useEditor((s) => s.site.collections.diary);
  const [open, setOpen] = useState<string | null>(null);
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const change = (id: string, patch: Partial<DiaryEntry>) => setCollections((c) => ({ ...c, diary: c.diary.map((e) => (e.id === id ? { ...e, ...patch } : e)) }), "Edit diary entry", `diary:${id}:${Object.keys(patch).join()}`);

  return (
    <>
      <button
        type="button"
        className="ed-btn ed-btn-primary qe-add"
        onClick={() => {
          const id = newId("entry");
          setCollections((c) => ({ ...c, diary: [{ id, date: today(), title: "", text: "" }, ...c.diary] }), "New diary entry");
          setOpen(id);
        }}
      >
        + New diary entry
      </button>
      {sorted.map((e) => (
        <section key={e.id} className="qe-card">
          <button type="button" className="qe-card-head" aria-expanded={open === e.id} onClick={() => setOpen(open === e.id ? null : e.id)}>
            <strong>{e.title || "Untitled entry"}</strong>
            <span>{e.date}</span>
          </button>
          {open === e.id ? (
            <>
              <input className="ed-input qe-input" value={e.title} placeholder="Title" aria-label="Title" onChange={(ev) => change(e.id, { title: ev.target.value })} />
              <input className="ed-input qe-input" type="date" value={e.date} aria-label="Date" onChange={(ev) => ev.target.value && change(e.id, { date: ev.target.value })} />
              <textarea className="ed-input qe-input qe-text" rows={5} value={e.text} placeholder="What happened?" aria-label="Entry text" onChange={(ev) => change(e.id, { text: ev.target.value })} />
              <MediaInput kind="image" label="Entry image" value={e.image} onChange={(image) => change(e.id, { image: image || undefined })} />
              {e.image ? <input className="ed-input qe-input" value={e.imageAlt ?? ""} placeholder="Describe the image (alt text)" aria-label="Alt text" onChange={(ev) => change(e.id, { imageAlt: ev.target.value || undefined })} /> : null}
              <button
                type="button"
                className="ed-btn ed-btn-ghost"
                onClick={() => {
                  if (window.confirm("Delete this diary entry?")) setCollections((c) => ({ ...c, diary: c.diary.filter((x) => x.id !== e.id) }), "Delete diary entry");
                }}
              >
                Delete entry
              </button>
            </>
          ) : null}
        </section>
      ))}
    </>
  );
}

// ------------------------------------------------------------ playlists

function PlaylistsTab() {
  const playlists = useEditor((s) => s.site.collections.playlists);
  const [open, setOpen] = useState<string | null>(null);
  const change = (id: string, patch: Partial<Playlist>) => setCollections((c) => ({ ...c, playlists: c.playlists.map((p) => (p.id === id ? { ...p, ...patch } : p)) }), "Edit playlist", `playlist:${id}:${Object.keys(patch).join()}`);

  return (
    <>
      <button
        type="button"
        className="ed-btn ed-btn-primary qe-add"
        onClick={() => {
          const id = newId("pl");
          setCollections((c) => ({ ...c, playlists: [...c.playlists, { id, title: "New playlist", spotify: "" }] }), "New playlist");
          setOpen(id);
        }}
      >
        + New playlist
      </button>
      {playlists.map((p) => (
        <section key={p.id} className="qe-card">
          <button type="button" className="qe-card-head" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)}>
            <strong>{p.title || "Untitled playlist"}</strong>
            <span>{p.spotify ? "Spotify" : "No link yet"}</span>
          </button>
          {open === p.id ? (
            <>
              <input className="ed-input qe-input" value={p.title} placeholder="Title" aria-label="Title" onChange={(ev) => change(p.id, { title: ev.target.value })} />
              <input className="ed-input qe-input" value={p.spotify} placeholder="Spotify playlist link" aria-label="Spotify link" inputMode="url" onChange={(ev) => change(p.id, { spotify: ev.target.value })} />
              <input className="ed-input qe-input" value={p.note ?? ""} placeholder="Note (optional)" aria-label="Note" onChange={(ev) => change(p.id, { note: ev.target.value || undefined })} />
              <MediaInput kind="image" label="Cover" value={p.cover} onChange={(cover) => change(p.id, { cover: cover || undefined })} />
              <button
                type="button"
                className="ed-btn ed-btn-ghost"
                onClick={() => {
                  if (window.confirm(`Delete the playlist "${p.title}"?`)) setCollections((c) => ({ ...c, playlists: c.playlists.filter((x) => x.id !== p.id) }), "Delete playlist");
                }}
              >
                Delete playlist
              </button>
            </>
          ) : null}
        </section>
      ))}
    </>
  );
}
