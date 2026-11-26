import { useEffect, useRef, useState } from "react";
import { earlierVersionsOf, ownerPage, statusOf, STATUS_LABEL, versionsOf } from "../../model/variants";
import { currentPage, useEditor } from "../store";
import { openDesigns } from "../templates/designs-open";
import { newVariant, openVersion, removeVariant, restore, setVariantPrefs, useVariantPrefs, type RowsMode } from "./actions";
import "./variants.css";

/**
 * "Versions · 3" in the top bar while a page has variants: the versions to jump between, how the
 * board shows them, earlier versions to bring back, and Review side by side.
 */
export function VersionsButton() {
  const site = useEditor((s) => s.site);
  const page = useEditor(currentPage);
  const prefs = useVariantPrefs();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  if (!site.pages.some((p) => p.id === page.id)) return null;
  const owner = ownerPage(site, page);
  const versions = versionsOf(site, owner.id);
  const earlier = earlierVersionsOf(site, owner.id);
  if (versions.length < 2 && !earlier.length) return null;
  const proposed = versions.filter((v) => v.variantOf && statusOf(v) === "proposed").length;
  return (
    <div className="ed-versions" ref={box} style={{ position: "relative" }}>
      <button type="button" className="ed-btn vr-review-btn ed-desk-only" aria-haspopup="dialog" aria-expanded={open} title={`${versions.length} versions of this page${proposed ? `, ${proposed} to review` : ""}: review, pick, bring back`} aria-label={`Versions of this page: ${versions.length}`} onClick={() => setOpen(!open)}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="4.5" y="1.5" width="10" height="10" rx="2" />
          <path d="M11.5 14.5h-8a2 2 0 0 1-2-2v-8" />
        </svg>
        <span className="vr-btn-long">Versions </span>
        {versions.length}
        {proposed ? <span className="vr-count" style={{ marginLeft: 6 }}>{proposed}<span className="vr-btn-long">&nbsp;to review</span></span> : null}
      </button>
      {open ? (
        <div className="vr-pop" role="dialog" aria-label={`Versions of ${owner.title}`} style={{ left: "auto", right: 0 }}>
          <h3>Versions of {owner.title}</h3>
          <p>Each version is a row on the board. Anyone can make one; a manager picks which becomes the page.</p>
          <ul>
            {versions.map((v) => (
              <li key={v.id} className={v.id === page.id ? "is-current" : undefined}>
                <button
                  type="button"
                  className="vr-row-name"
                  onClick={() => {
                    openVersion(v.id);
                    setOpen(false);
                  }}
                >
                  {v.variantOf ? v.variantName : v.title}
                </button>
                {v.variantOf ? <span className={`vr-chip is-${statusOf(v)}`}>{STATUS_LABEL[statusOf(v)]}</span> : <span className={`vr-chip ${v.status === "published" ? "is-live" : ""}`}>{v.status === "published" ? "Live page" : "The page"}</span>}
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="ed-btn ed-btn-sm ed-btn-variant"
              onClick={() => {
                openDesigns(owner.id);
                setOpen(false);
              }}
            >
              Review side by side
            </button>
            <button
              type="button"
              className="ed-btn ed-btn-sm"
              onClick={() => {
                newVariant(owner.id);
                setOpen(false);
              }}
            >
              + New variant
            </button>
          </div>
          <hr />
          <label>
            <small>On the board</small>
            <select className="ed-input" value={prefs.rows} onChange={(e) => setVariantPrefs({ rows: e.target.value as RowsMode })}>
              <option value="all">Every version as a row</option>
              <option value="proposed">The page and proposed ones</option>
              <option value="none">Only the one I'm editing</option>
            </select>
          </label>
          <label>
            <input type="checkbox" checked={prefs.outline} onChange={(e) => setVariantPrefs({ outline: e.target.checked })} /> Outline what changed
          </label>
          {earlier.length ? (
            <>
              <hr />
              <small>Earlier versions (kept after a pick)</small>
              <ul>
                {earlier.map((v) => (
                  <li key={v.id}>
                    <span className="vr-row-name" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {v.variantName}
                      {v.variantBy ? <small> · {v.variantBy}</small> : null}
                    </span>
                    <button type="button" className="ed-btn ed-btn-sm" title="Make it a draft variant again, as a row on the board" onClick={() => restore(v.id)}>
                      Bring back
                    </button>
                    <button type="button" className="ed-btn ed-btn-sm" aria-label={`Delete ${v.variantName}`} title="Delete for good" onClick={() => window.confirm(`Delete ${v.variantName} for good?`) && removeVariant(v.id)}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
