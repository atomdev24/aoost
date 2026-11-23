import { ownerPage } from "../../model/variants";
import { staticVariant } from "../../render/media";
import { currentPage, setPage, useEditor } from "../store";
import { openDesigns } from "./designs-open";
import { SITE_TEMPLATES } from "./site-templates";
import { designsFor, newPageFrom, removeDesign, tryOnPage } from "./templates";
import "./templates.css";

/**
 * Templates (the demo's left rail): ready-made page designs. Start a page from
 * one, or try a few on the page on screen, compare them side by side and keep one.
 */
export function TemplatesPanel() {
  const site = useEditor((s) => s.site);
  const page = useEditor(currentPage);
  const owner = ownerPage(site, page);
  const designs = designsFor(site, page);
  return (
    <div className="ed-tpl">
      <p className="ed-tpl-intro">
        Start a page from a design, or try a few on <strong>{owner.title}</strong> and keep the one you like.
      </p>
      <ul className="ed-tpl-list">
        {SITE_TEMPLATES.map((t) => (
          <li key={t.id} className="ed-tpl-card">
            <img src={staticVariant(t.thumb, 480)} alt="" loading="lazy" />
            <div className="ed-tpl-text">
              <strong>{t.name}</strong>
              <small>{t.hint}</small>
            </div>
            <div className="ed-tpl-actions">
              <button type="button" className="ed-btn ed-btn-sm ed-btn-variant" onClick={() => tryOnPage(t)} title={`Add it as another design for ${owner.title}`}>
                Try on {owner.title}
              </button>
              <button type="button" className="ed-btn ed-btn-sm" onClick={() => newPageFrom(t)}>
                New page
              </button>
            </div>
          </li>
        ))}
      </ul>
      {designs.length ? (
        <section className="ed-tpl-designs" aria-label={`Designs for ${owner.title}`}>
          <h3>Designs for {owner.title}</h3>
          <ul>
            <li className={page.id === owner.id ? "is-on" : ""}>
              <button type="button" className="ed-tpl-design" onClick={() => setPage(owner.id)}>
                {owner.title} as it is
              </button>
            </li>
            {designs.map((d) => (
              <li key={d.id} className={page.id === d.id ? "is-on" : ""}>
                <button type="button" className="ed-tpl-design" onClick={() => setPage(d.id)}>
                  {d.variantName}
                </button>
                <button type="button" className="ed-tpl-remove" aria-label={`Remove ${d.variantName}`} title="Remove this design" onClick={() => removeDesign(d.id)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="ed-btn ed-btn-variant ed-tpl-compare" onClick={() => openDesigns(owner.id)}>
            Compare side by side
          </button>
        </section>
      ) : null}
    </div>
  );
}
