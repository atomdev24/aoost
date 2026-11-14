import { setPage, useEditor } from "../store";

/** The pages list (left panel). New-page flow and nav toggles arrive in Phase 3. */
export function PagesPanel() {
  const pages = useEditor((s) => s.site.pages);
  const pageId = useEditor((s) => s.pageId);
  const ordered = pages.filter((p) => !p.parentId).flatMap((p) => [p, ...pages.filter((c) => c.parentId === p.id)]);
  return (
    <div className="ed-panel">
      <div className="ed-panel-head">
        <span className="ed-caps">{pages.length} pages</span>
      </div>
      <ul className="ed-pages">
        {ordered.map((p) => (
          <li key={p.id} className={p.parentId ? "ed-page-child" : undefined}>
            <button type="button" className="ed-page" aria-current={p.id === pageId ? "page" : undefined} onClick={() => setPage(p.id)}>
              <span className="ed-page-title">{p.title}</span>
              <span className="ed-page-slug">{p.slug}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
