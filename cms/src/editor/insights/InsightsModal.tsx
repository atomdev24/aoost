import { useEffect, useMemo, useState } from "react";
import { clarityIdFrom, clarityLinks, devices, summarise, type PageInsights } from "../../model/insights";
import { api, type InsightsReply } from "../api";
import { DEMO } from "../demo";
import { update, useEditor } from "../store";
import { useCan } from "../team/role";
import { Button, Modal } from "../ui/kit";
import "./insights.css";

const RANGES = [7, 30, 90] as const;
const SITE = "https://alexoostendurp.com";

const fmtTime = (s: number | null) => (s === null ? "–" : s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, "0")}s`);
const fmtPct = (n: number | null) => (n === null ? "–" : `${Math.round(n)}%`);
const ago = (at: number) => {
  const m = Math.round((Date.now() - at) / 60000);
  return m < 60 ? `${m} min ago` : m < 48 * 60 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
};

function Spark({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - (v / max) * 26}`).join(" ");
  return (
    <svg className="ed-ins-spark" viewBox="0 0 100 30" preserveAspectRatio="none" role="img" aria-label={label}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Visitor insights (Microsoft Clarity): set up the project on the site, then see each page's
 * visits, scroll depth, time and frustration clicks, with links to its heatmap and recordings in
 * Clarity. The numbers come in once a day. The demo shows the real site's numbers, read-only.
 */
export function InsightsModal({ onClose }: { onClose: () => void }) {
  const manager = useCan("promote");
  const editor = useCan("edit");
  const analytics = useEditor((s) => s.site.settings.analytics);
  const pages = useEditor((s) => s.site.pages);
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [data, setData] = useState<InsightsReply | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [idInput, setIdInput] = useState(analytics?.clarity ?? "");

  useEffect(() => {
    api
      .insights(range)
      .then(setData)
      .catch((e: Error) => setNote(e.message));
  }, [range]);

  const rows = useMemo(() => (data ? summarise(data.days) : []), [data]);
  const split = useMemo(() => (data ? devices(data.days) : []), [data]);
  const project = DEMO ? data?.project : (analytics?.clarity ?? data?.project ?? null);
  const total = rows.reduce((n, r) => n + r.sessions, 0);
  const weighted = (pick: (r: PageInsights) => number | null) => {
    let s = 0,
      w = 0;
    for (const r of rows) {
      const v = pick(r);
      if (v !== null && r.sessions) (s += v * r.sessions), (w += r.sessions);
    }
    return w ? s / w : null;
  };
  const trend = data ? summarise(data.days).reduce<number[]>((acc, r) => r.trend.map((v, i) => v + (acc[i] ?? 0)), []) : [];
  const title = (path: string) => pages.find((p) => p.slug === path || (path === "/" && p.isHome))?.title ?? path;

  const saveProject = () => {
    const id = idInput.trim() ? clarityIdFrom(idInput) : null;
    if (idInput.trim() && !id) return setNote("That doesn't look like a Clarity project ID. It's the short code in the Clarity address, after /projects/view/.");
    update((site) => ({ ...site, settings: { ...site.settings, analytics: id ? { ...site.settings.analytics, clarity: id } : undefined } }), id ? "Add visitor insights (Clarity)" : "Remove visitor insights");
    void api.putInsightsProject(id).catch(() => undefined);
    setIdInput(id ?? "");
    setNote(id ? "Added. Publish the site to start counting visits; the first numbers arrive the next morning." : "Removed from the site. Publish to take it off the live pages.");
  };
  const fetchNow = async () => {
    setBusy(true);
    setNote(null);
    try {
      setData(await api.fetchInsights());
      setNote("Fetched the last 24 hours.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Couldn't fetch.");
      void api.insights(range).then(setData).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Visitor insights" onClose={onClose} wide>
      <div className="ed-ins">
        <p className="ed-hint">
          {DEMO ? "Live numbers from alexoostendurp.com, read-only. " : ""}How people use the published pages, from Microsoft Clarity: visits, how far they scroll, how long they stay, and clicks that went nowhere.
        </p>

        {!DEMO ? (
          <section className="ed-ins-setup" aria-label="Setup">
            <label className="ed-ins-row">
              <span>
                <b>Clarity project</b>
                <small>{analytics?.clarity ? "On the site's pages from the next publish." : "Paste the project ID or a link to the project."}</small>
              </span>
              <span className="ed-ins-inline">
                <input className="ed-input" value={idInput} placeholder="zju5sls37v" aria-label="Clarity project ID" disabled={!editor} onChange={(e) => setIdInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveProject()} />
                <Button onClick={saveProject} disabled={!editor || (clarityIdFrom(idInput) ?? "") === (analytics?.clarity ?? "")}>
                  {idInput.trim() ? "Save" : "Remove"}
                </Button>
              </span>
            </label>
            {analytics?.clarity ? (
              <label className="ed-ins-row">
                <span>
                  <b>Cookie notice</b>
                  <small>A small note, bottom left, asking visitors if Clarity may count them. Clarity waits for a yes from visitors in Europe.</small>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={analytics.notice !== false}
                  disabled={!editor}
                  onChange={(e) => update((site) => ({ ...site, settings: { ...site.settings, analytics: { ...site.settings.analytics, notice: e.target.checked ? undefined : false } } }), e.target.checked ? "Show the cookie notice" : "Hide the cookie notice")}
                />
              </label>
            ) : null}
            <div className="ed-ins-row">
              <span>
                <b>Daily numbers</b>
                <small>
                  {!data ? "…" : !data.token ? "Waiting for the Clarity token in Cloudflare (CLARITY_API_TOKEN). Steps are in BLOCKERS.md." : data.last ? `Fetched ${ago(data.last.at)}${data.last.error ? `: ${data.last.error}` : "."} Every morning at 03:00.` : "Fetched every morning at 03:00."}
                </small>
              </span>
              <Button onClick={() => void fetchNow()} disabled={!manager || !data?.token || busy}>
                {busy ? "Fetching…" : "Fetch now"}
              </Button>
            </div>
          </section>
        ) : null}

        <div className="ed-ins-head">
          <div className="ed-seg" role="radiogroup" aria-label="Period">
            {RANGES.map((r) => (
              <button key={r} type="button" role="radio" aria-checked={range === r} onClick={() => setRange(r)}>
                {r} days
              </button>
            ))}
          </div>
          {project ? (
            <a className="ed-ins-out" href={clarityLinks(project, SITE).dashboard} target="_blank" rel="noreferrer">
              Open Clarity ↗
            </a>
          ) : null}
        </div>

        {data && rows.length ? (
          <>
            <div className="ed-ins-tiles">
              <div>
                <small>Visits</small>
                <b>{total.toLocaleString()}</b>
                <Spark values={trend} label="Visits per day" />
              </div>
              <div>
                <small>Scrolled</small>
                <b>{fmtPct(weighted((r) => r.scroll))}</b>
                <span className="ed-ins-sub">of the page, on average</span>
              </div>
              <div>
                <small>Time on page</small>
                <b>{fmtTime(weighted((r) => r.activeTime))}</b>
                <span className="ed-ins-sub">active, on average</span>
              </div>
              <div>
                <small>Frustrated clicks</small>
                <b>{rows.reduce((n, r) => n + r.rageClicks + r.deadClicks, 0)}</b>
                <span className="ed-ins-sub">rage and dead clicks</span>
              </div>
            </div>
            {split.length ? (
              <div className="ed-ins-devices" aria-label="Visits by device">
                {split.map((d) => (
                  <span key={d.device} style={{ flexGrow: Math.max(1, d.sessions) }} title={`${d.device}: ${d.sessions}`}>
                    {d.device} {total ? Math.round((d.sessions / split.reduce((n, x) => n + x.sessions, 0)) * 100) : 0}%
                  </span>
                ))}
              </div>
            ) : null}
            <div className="ed-ins-table" role="table" aria-label="Pages">
              <div role="row" className="ed-ins-tr ed-ins-th">
                <span role="columnheader">Page</span>
                <span role="columnheader">Visits</span>
                <span role="columnheader">Scrolled</span>
                <span role="columnheader">Time</span>
                <span role="columnheader" title="Rage clicks, dead clicks and quick backs">Frustration</span>
                <span role="columnheader" aria-label="Open in Clarity" />
              </div>
              {rows.slice(0, 60).map((r) => {
                const links = project ? clarityLinks(project, SITE + (r.path === "/" ? "/" : r.path)) : null;
                const frustration = r.rageClicks + r.deadClicks + r.quickBacks;
                return (
                  <div role="row" className="ed-ins-tr" key={r.path}>
                    <span role="cell" className="ed-ins-page">
                      <b>{title(r.path)}</b>
                      {title(r.path) !== r.path ? <small>{r.path}</small> : null}
                    </span>
                    <span role="cell" className="ed-ins-num">
                      {r.sessions}
                      <Spark values={r.trend} label={`Visits per day on ${r.path}`} />
                    </span>
                    <span role="cell">{fmtPct(r.scroll)}</span>
                    <span role="cell">{fmtTime(r.activeTime)}</span>
                    <span role="cell" className={frustration ? "ed-ins-warn" : undefined}>
                      {frustration || "–"}
                    </span>
                    <span role="cell" className="ed-ins-links">
                      {links ? (
                        <>
                          <a href={links.heatmap} target="_blank" rel="noreferrer">
                            Heatmap ↗
                          </a>
                          <a href={links.recordings} target="_blank" rel="noreferrer">
                            Recordings ↗
                          </a>
                        </>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : data ? (
          <div className="ed-ins-empty">
            <b>No numbers yet</b>
            <p>{analytics?.clarity || DEMO ? "Clarity starts counting once the published pages carry its code. The first numbers arrive the next morning." : "Add the Clarity project above, then publish."}</p>
          </div>
        ) : null}
        {note ? (
          <p className="ed-hint" role="status">
            {note}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
