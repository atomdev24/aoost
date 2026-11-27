import { useId, useState } from "react";
import { createPage, slugify } from "../../model/pages";
import { getState, setPage, update, useEditor } from "../store";
import { Button, Modal } from "./kit";
import { openWriter } from "../writer/writer-open";
import { addCampaignFromBrief, BRIEF_ASKS, BRIEF_PRODUCTS, briefText, type BriefAsk, type BriefProduct } from "../templates/campaign-brief";
import { getAuthor, newId, send } from "../comments/store";
import { DEMO } from "../demo";
import { LEGACY_PAGE_TEMPLATES, STRUCTURES, structure } from "../../model/structures";
import { siteTemplate } from "../templates/site-templates";
import { WireThumb } from "./WireThumb";

/** New page: name → automatic URL, a template, "show in navigation" and "place it". */
export function NewPageModal({ onClose }: { onClose: () => void }) {
  const pages = useEditor((s) => s.site.pages);
  // Saved page templates of the site's own; the old portfolio starters gave way to the layouts.
  const templates = useEditor((s) => s.site.templates).filter((t) => t.kind === "page" && !LEGACY_PAGE_TEMPLATES.includes(t.id));
  const [name, setName] = useState("");
  /** "s:<layout id>" for a built-in layout, "t:<template id>" for a saved one. */
  const [choice, setChoice] = useState("s:blank");
  const [showInNav, setShowInNav] = useState(true);
  const [kind, setKind] = useState<"page" | "campaign" | "post">("page");
  const blog = pages.find((p) => p.id === "blog" || p.slug === "/blog");
  const [parentId, setParentId] = useState("");
  const [unpublishAt, setUnpublishAt] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const uid = useId();
  // Campaign pages: from a brief (built from the Aerobotics blocks), or from a template.
  const siteLangs = useEditor((s) => s.site.settings.languages);
  const langs = (siteLangs ?? []).slice(1);
  // Briefs build Aerobotics pages: offered in the demo and on a site that uses the Aerobotics nav.
  const aero = useEditor((s) => DEMO || s.site.nav.logoImage === "/art/tpl_aero_logo.svg");
  const [fromBrief, setFromBrief] = useState(true);
  const [when, setWhen] = useState("");
  const [where, setWhere] = useState("");
  const [product, setProduct] = useState<BriefProduct>("binscan");
  const [ask, setAsk] = useState<BriefAsk>("meeting");
  const [message, setMessage] = useState("");
  const [briefLangs, setBriefLangs] = useState<string[]>([]);
  const [askClaude, setAskClaude] = useState(true);
  const briefMode = aero && kind === "campaign" && fromBrief;
  const pickKind = (k: typeof kind) => {
    setKind(k);
    // Posts go under the blog page when there is one.
    if (k === "post" && blog && !parentId) setParentId(blog.id);
  };

  const parent = pages.find((p) => p.id === parentId);
  const preview = `${parent ? parent.slug : ""}/${slugify(name)}`;
  const create = () => {
    if (!name.trim()) return;
    if (briefMode) return createFromBrief();
    let made = "";
    update(
      (site) => {
        const st = choice.startsWith("s:") ? structure(choice.slice(2)) : undefined;
        // On an Aerobotics site (and the demo) the layouts that have an Aerobotics page use it.
        const aeroT = st?.aero && aero ? siteTemplate(st.aero) : undefined;
        const result = createPage(site, {
          name,
          ...(st ? { sections: aeroT ? aeroT.sections() : st.sections(), structureId: st.id } : { templateId: choice.slice(2) }),
          showInNav: kind === "page" && showInNav,
          parentId: parentId || null,
          kind,
          unpublishAt: unpublishAt || undefined,
          date,
        });
        made = result.pageId;
        return result.site;
      },
      `${kind === "post" ? "New blog post" : kind === "campaign" ? "New campaign page" : "New page"} ${name.trim()}`,
    );
    if (made && getState().site.pages.some((p) => p.id === made)) {
      setPage(made);
      if (kind === "post") openWriter(made);
    }
    onClose();
  };

  const createFromBrief = () => {
    const brief = {
      event: name,
      when,
      where,
      product,
      ask,
      message,
      languages: briefLangs,
      endDate: unpublishAt || undefined,
    };
    let made = "";
    update((site) => {
      const r = addCampaignFromBrief(site, brief, {
        parentId: parentId || null,
      });
      made = r.pageId;
      return r.site;
    }, `New campaign page ${name.trim()} (from a brief)`);
    if (!made) return onClose();
    setPage(made);
    // The same brief to Claude, as a task on the hero: polish the words, do the other languages.
    const hero = getState().site.pages.find((p) => p.id === made)?.sections[0]?.children[0];
    if (askClaude && hero)
      void send({
        op: "create",
        id: newId("c"),
        pageId: made,
        nodeId: hero.id,
        bp: "desktop",
        fx: 0.08,
        fy: 0.12,
        label: "Hero",
        by: getAuthor() ?? { name: "Brief", color: "#D97757" },
        text: briefText(brief),
      });
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
            {kind === "post" ? "Post title" : briefMode ? "Event or campaign" : "Page name"}
          </label>
          <input
            id={`${uid}-name`}
            className="ed-input ed-input-lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={briefMode ? "e.g. Interpoma 2026" : "e.g. Spring launch"}
            autoFocus
          />
          <span className="ed-hint">URL: alexoostendurp.com{preview}</span>
        </div>

        {aero && kind === "campaign" ? (
          <div className="ed-seg ed-brief-switch" role="radiogroup" aria-label="Start from">
            <button type="button" role="radio" aria-checked={fromBrief} onClick={() => setFromBrief(true)}>
              From a brief
            </button>
            <button type="button" role="radio" aria-checked={!fromBrief} onClick={() => setFromBrief(false)}>
              From a template
            </button>
          </div>
        ) : null}

        {briefMode ? (
          <div className="ed-brief">
            <div className="ed-form-two">
              <label className="ed-field">
                <span className="ed-field-label">Dates</span>
                <input className="ed-input" value={when} onChange={(e) => setWhen(e.target.value)} placeholder="25–27 Nov 2026" />
              </label>
              <label className="ed-field">
                <span className="ed-field-label">Where</span>
                <input className="ed-input" value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Bolzano, stand B12" />
              </label>
            </div>
            <div className="ed-field">
              <span className="ed-field-label">Product</span>
              <div className="ed-chips" role="radiogroup" aria-label="Product">
                {(Object.keys(BRIEF_PRODUCTS) as BriefProduct[]).map((k) => (
                  <button key={k} type="button" role="radio" aria-checked={product === k} onClick={() => setProduct(k)}>
                    {BRIEF_PRODUCTS[k].name.replace("TrueFruit ", "")}
                  </button>
                ))}
              </div>
            </div>
            <div className="ed-field">
              <span className="ed-field-label">Ask people to</span>
              <div className="ed-chips" role="radiogroup" aria-label="Ask people to">
                {(Object.keys(BRIEF_ASKS) as BriefAsk[]).map((k) => (
                  <button key={k} type="button" role="radio" aria-checked={ask === k} onClick={() => setAsk(k)}>
                    {BRIEF_ASKS[k].label}
                  </button>
                ))}
              </div>
            </div>
            <label className="ed-field">
              <span className="ed-field-label">The one thing to say (optional)</span>
              <input
                className="ed-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`See ${BRIEF_PRODUCTS[product].name} live at ${name.trim() || "the show"}`}
              />
            </label>
            {langs.length ? (
              <div className="ed-field">
                <span className="ed-field-label">Also in</span>
                <div className="ed-chips" role="group" aria-label="Also in">
                  {langs.map((l) => (
                    <button
                      key={l}
                      type="button"
                      aria-pressed={briefLangs.includes(l)}
                      onClick={() => setBriefLangs((x) => (x.includes(l) ? x.filter((y) => y !== l) : [...x, l]))}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <label className="ed-check">
              <input type="checkbox" checked={askClaude} onChange={(e) => setAskClaude(e.target.checked)} />
              Ask Claude to polish the words
              {briefLangs.length ? " and translate" : ""} (an @Claude comment on the page)
            </label>
          </div>
        ) : null}

        {kind === "campaign" ? (
          <div className="ed-field">
            <label className="ed-field-label ed-field-label-lg" htmlFor={`${uid}-end`}>
              Take it down after (optional)
            </label>
            <input
              id={`${uid}-end`}
              type="date"
              className="ed-input ed-input-lg"
              value={unpublishAt}
              onChange={(e) => setUnpublishAt(e.target.value)}
            />
            <span className="ed-hint">
              After this day the link shows the site's "not found" page. Campaign pages never show in the nav or search.
            </span>
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

        {kind === "post" || briefMode ? null : (
          <div className="ed-field">
            <span className="ed-field-label ed-field-label-lg">Start from</span>
            <div className="ed-templates">
              {STRUCTURES.map((t) => (
                <button key={t.id} type="button" aria-pressed={choice === `s:${t.id}`} title={t.hint} onClick={() => setChoice(`s:${t.id}`)}>
                  <WireThumb kind={t.id} />
                  <span>{t.name}</span>
                </button>
              ))}
              {templates.map((t) => (
                <button key={t.id} type="button" aria-pressed={choice === `t:${t.id}`} title="One of your saved page templates" onClick={() => setChoice(`t:${t.id}`)}>
                  <WireThumb kind="custom" />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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
