import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { changedIds, ownerPage, statusOf, STATUS_LABEL, versionsOf } from "../../model/variants";
import type { Page, Site } from "../../schema";
import { useOpenComments } from "../variants/comment-count";
import { flush, useEditor } from "../store";
import { useCan } from "../team/role";
import { openVersion, setVariantPrefs, useVariantPrefs, vote, voter } from "../variants/actions";
import { openPick } from "../variants/pick-open";
import { CHANGED_CSS } from "../variants/changed-css";
import { closeDesigns, useDesignsOpen } from "./designs-open";
import "./templates.css";
import "../variants/variants.css";

const previewPath = (slug: string) => (slug === "/" ? "/" : `${slug}/`);
const WIDTH = { desktop: 1440, mobile: 390 } as const;
type Size = keyof typeof WIDTH;

/** One version's live preview, scaled to its column, scrolling with the others. */
function Column({ site, page, owner, ready, size, outline, onScroll, register }: { site: Site; page: Page; owner: Page; ready: boolean; size: Size; outline: boolean; onScroll: (id: string, y: number) => void; register: (id: string, w: Window | null) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [dims, setDims] = useState({ w: 400, h: 600 });
  useLayoutEffect(() => {
    const el = box.current!;
    const ro = new ResizeObserver(() => setDims({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = Math.min(1, dims.w / WIDTH[size]);
  const changed = useMemo(() => (page.variantOf ? changedIds(site, page) : []), [site, page]);
  const mark = () => {
    const doc = frame.current?.contentDocument;
    if (!doc?.body) return;
    let style = doc.getElementById("ed-review-css");
    if (!style) {
      style = doc.createElement("style");
      style.id = "ed-review-css";
      doc.head.appendChild(style);
    }
    style.textContent = outline ? CHANGED_CSS : "";
    doc.querySelectorAll("[data-ed-changed]").forEach((el) => el.removeAttribute("data-ed-changed"));
    if (outline && changed.length) doc.querySelectorAll(changed.flatMap((id) => [`.n-${CSS.escape(id)}`, `.s#${CSS.escape(id)}`]).join(",")).forEach((el) => el.setAttribute("data-ed-changed", ""));
  };
  useEffect(mark, [outline, changed]); // eslint-disable-line react-hooks/exhaustive-deps

  const isOwner = page.id === owner.id;
  const status = isOwner ? null : statusOf(page);
  const comments = useOpenComments(page.id);
  const canPick = useCan("promote");
  const votes = page.variantVotes ?? [];
  const mine = votes.some((v) => v.id === voter().id);
  return (
    <section className="rv-col" aria-label={isOwner ? owner.title : page.variantName}>
      <header className="rv-col-head">
        <strong>{isOwner ? owner.title : page.variantName}</strong>
        {isOwner ? <span className={`vr-chip ${owner.status === "published" ? "is-live" : "is-page"}`}>{owner.status === "published" ? "Live page" : "The page"}</span> : <span className={`vr-chip is-${status}`}>{STATUS_LABEL[status!]}</span>}
        <span className="rv-by">{isOwner ? "as it is now" : (page.variantBy ?? "")}</span>
        {!isOwner && changed.length ? <span className="rv-changes">{changed.length === 1 ? "1 change" : `${changed.length} changes`}</span> : null}
      </header>
      <div className="rv-view" ref={box}>
        <iframe
          ref={frame}
          title={isOwner ? owner.title : (page.variantName ?? "Variant")}
          src={ready ? `/preview${previewPath(page.slug)}` : "about:blank"}
          style={{ width: WIDTH[size], height: dims.h / scale, transform: `scale(${scale})` }}
          onLoad={() => {
            if (!ready) return;
            const w = frame.current?.contentWindow ?? null;
            register(page.id, w);
            w?.addEventListener("scroll", () => onScroll(page.id, w.scrollY), { passive: true });
            mark();
            setTimeout(mark, 800);
          }}
        />
      </div>
      <footer className="rv-col-foot">
        {!isOwner ? (
          <button type="button" className={`vr-vote${mine ? " is-on" : ""}`} aria-pressed={mine} onClick={() => vote(page.id)}>
            ▲ {votes.length}
          </button>
        ) : null}
        <span className="rv-sub">{comments === 1 ? "1 comment" : `${comments} comments`}</span>
        {votes.length ? <span className="rv-sub rv-voters">{votes.map((v) => v.name).join(", ")}</span> : null}
        <span className="rv-spacer" />
        <button
          type="button"
          className="ed-btn ed-btn-sm"
          onClick={() => {
            closeDesigns();
            openVersion(page.id);
          }}
        >
          Edit
        </button>
        {canPick ? (
          <button type="button" className={`ed-btn ed-btn-sm${isOwner ? "" : " ed-btn-variant"}`} onClick={() => openPick(page.id)}>
            {isOwner ? "Keep as it is" : "Pick this one"}
          </button>
        ) : null}
      </footer>
    </section>
  );
}

/**
 * Review (EDITOR-VARIANTS.md): every version of a page side by side, scrolling together, with what
 * each variant changed outlined, votes and comments, and Pick for managers. Opened from the board,
 * the top bar, a variant's band or the Pages panel. (Kept under its old name: the Templates panel's
 * "Compare designs" opens it too.)
 */
export function DesignsBoard() {
  const pageId = useDesignsOpen();
  const site = useEditor((s) => s.site);
  const start = site.pages.find((p) => p.id === pageId);
  const owner = start ? ownerPage(site, start) : null;
  const all = owner ? versionsOf(site, owner.id) : [];
  const prefs = useVariantPrefs();
  const [size, setSize] = useState<Size>("desktop");
  const [onlyProposed, setOnlyProposed] = useState(false);
  const shown = all.filter((p) => !onlyProposed || p.id === owner?.id || statusOf(p) === "proposed");
  const [copied, setCopied] = useState(false);
  // The previews read the saved draft: save first, then load them.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!pageId) return;
    setReady(false);
    void flush().finally(() => setReady(true));
  }, [pageId, all.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scrolling one column scrolls the rest to the same place.
  const wins = useRef(new Map<string, Window>());
  const leading = useRef<{ id: string; t: number } | null>(null);
  const register = (id: string, w: Window | null) => (w ? wins.current.set(id, w) : wins.current.delete(id));
  const onScroll = (id: string, y: number) => {
    const now = performance.now();
    if (leading.current && leading.current.id !== id && now - leading.current.t < 120) return;
    leading.current = { id, t: now };
    wins.current.forEach((w, other) => other !== id && Math.abs(w.scrollY - y) > 1 && w.scrollTo(0, y));
  };

  useEffect(() => {
    if (!pageId) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector(".vp")) return;
      e.stopPropagation();
      closeDesigns();
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [pageId]);

  if (!pageId) return null;
  if (!owner) {
    closeDesigns();
    return null;
  }
  const copyLink = async () => {
    const url = `${location.origin}${location.pathname}?page=${encodeURIComponent(owner.id)}&review=1`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy the review link:", url);
    }
  };
  return (
    <div className="ed-dz rv" role="dialog" aria-modal="true" aria-label={`Review ${owner.title}`}>
      <header className="ed-dz-head rv-head">
        <strong>Review · {owner.title}</strong>
        <span className="ed-dz-hint">{shown.length} versions · scroll any one, they all move together</span>
        <div className="rv-seg" role="group" aria-label="Screen size">
          {(["desktop", "mobile"] as const).map((s) => (
            <button key={s} type="button" aria-pressed={size === s} className={size === s ? "is-on" : ""} onClick={() => setSize(s)}>
              {s === "desktop" ? "Desktop" : "Mobile"}
            </button>
          ))}
        </div>
        <label className="rv-check">
          <input type="checkbox" checked={prefs.outline} onChange={(e) => setVariantPrefs({ outline: e.target.checked })} /> Outline what changed
        </label>
        <label className="rv-check">
          <input type="checkbox" checked={onlyProposed} onChange={(e) => setOnlyProposed(e.target.checked)} /> Only proposed
        </label>
        <span className="ed-compare-spacer" />
        <button type="button" className="ed-btn ed-btn-sm" onClick={() => void copyLink()}>
          {copied ? "Copied" : "Copy review link"}
        </button>
        <button type="button" className="ed-btn ed-btn-sm" onClick={closeDesigns}>
          Close
        </button>
      </header>
      {shown.length < 2 ? (
        <p className="rv-empty">Nothing to compare yet. Make a variant of {owner.title} (+ New variant, under the page on the board) to try another design.</p>
      ) : (
        <div className="rv-cols" style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(${size === "mobile" ? 260 : 360}px, 1fr))` }}>
          {shown.map((p) => (
            <Column key={`${p.id}:${size}`} site={site} page={p} owner={owner} ready={ready} size={size} outline={prefs.outline} onScroll={onScroll} register={register} />
          ))}
        </div>
      )}
      <footer className="rv-foot">
        <span className="ed-variant-dot" aria-hidden="true" />
        Anyone can vote and comment. Picking needs the Manager role; the other versions are kept as earlier versions.
      </footer>
    </div>
  );
}
