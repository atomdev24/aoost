import { useRef } from "react";
import { renamePage } from "../../model/pages";
import type { Page } from "../../schema";
import { MediaInput } from "../fields/media";
import { update, updatePage, useEditor } from "../store";
import { TextInput } from "../ui/kit";
import { closeWriter, useWriterOpen } from "./writer-open";
import "./writer.css";

/**
 * The blog writer (UI spec, Nov 2026): a quiet, doc-like place to write a post. Title, date, cover
 * and summary on top, then the body as plain text with a few marks. The post's template does the
 * layout, so teammates only write.
 */
export function BlogWriter() {
  const pageId = useWriterOpen();
  const page = useEditor((s) => (pageId ? s.site.pages.find((p) => p.id === pageId) : undefined));
  if (!pageId || !page) return null;
  return <Writer page={page} />;
}

function Writer({ page }: { page: Page }) {
  const area = useRef<HTMLTextAreaElement>(null);
  const bodyNode = page.sections.flatMap((s) => s.children).find((n) => n.type === "PostBody");
  const body = typeof bodyNode?.content.body === "string" ? bodyNode.content.body : "";
  const post = page.post ?? { date: new Date().toISOString().slice(0, 10) };
  const setPost = (fields: Partial<NonNullable<Page["post"]>>, label: string) =>
    update((s) => ({ ...s, pages: s.pages.map((p) => (p.id === page.id ? { ...p, post: Object.fromEntries(Object.entries({ ...post, ...fields }).filter(([, v]) => v !== undefined && v !== "")) as NonNullable<Page["post"]> } : p)) }), label);
  const setBody = (text: string) =>
    bodyNode && updatePage(page.id, (p) => ({ ...p, sections: p.sections.map((s) => ({ ...s, children: s.children.map((n) => (n.id === bodyNode.id ? { ...n, content: { ...n.content, body: text } } : n)) })) }), "Write the post", { merge: `post-${page.id}` });
  const insertPicture = (url: string) => {
    if (!url) return;
    const el = area.current;
    const at = el ? el.selectionStart : body.length;
    const snippet = `\n\n![Describe the picture](${url})\n\n`;
    setBody(body.slice(0, at) + snippet + body.slice(at));
  };
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  return (
    <div className="wr" role="dialog" aria-modal="true" aria-label="Blog writer">
      <header className="wr-top">
        <span className="wr-crumb">Blog post · {page.status === "published" ? "Live" : "Draft"}</span>
        <span className="wr-count">{words} words</span>
        <button type="button" className="ed-btn ed-btn-primary ed-btn-sm" onClick={closeWriter}>
          Done
        </button>
      </header>
      <div className="wr-page">
        <div className="wr-meta">
          <label>
            <span>Date</span>
            <input type="date" className="ed-input" value={post.date} onChange={(e) => e.target.value && setPost({ date: e.target.value }, "Set the post date")} />
          </label>
          <div className="wr-cover">
            <span>Cover picture</span>
            <MediaInput kind="image" label="Cover picture" value={post.cover} onChange={(cover) => setPost({ cover: cover || undefined }, "Set the post cover")} />
          </div>
        </div>
        <TextInput value={page.title} placeholder="Post title" onCommit={(t) => t && update((s) => renamePage(s, page.id, t), "Rename the post")} />
        <TextInput value={post.excerpt ?? ""} placeholder="A one-line summary for the blog list" onCommit={(excerpt) => setPost({ excerpt: excerpt || undefined }, "Edit the post summary")} />
        <textarea ref={area} className="wr-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Start writing…" aria-label="Post body" spellCheck />
        <footer className="wr-help">
          <span>
            <code># Heading</code> <code>**bold**</code> <code>*italic*</code> <code>[link](https://…)</code> <code>- list</code> <code>&gt; quote</code>. A blank line starts a new paragraph.
          </span>
          <span className="wr-pic">
            <MediaInput kind="image" label="Add a picture to the post" value={undefined} onChange={insertPicture} />
          </span>
        </footer>
      </div>
    </div>
  );
}
