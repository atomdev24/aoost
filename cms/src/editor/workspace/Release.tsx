import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Release } from "../../model/release";
import { api } from "../api";
import { anchorOf, Popover, type Anchor } from "../ui/Popover";
import { Button } from "../ui/kit";
import { openSheet, publish } from "./publish";

/**
 * Releases in the top bar (Alex picked C): Publish has a small menu (Publish now, Schedule…, Send to
 * staging), and a chip beside it shows what's scheduled, live or stopped, with Cancel and Undo.
 * The schedule runs on the server (worker/release.ts); this only sets and shows it.
 */

// ------------------------------------------------------------ the release, shared and refreshed

export let current: Release | null = null;
let loaded = false;
const listeners = new Set<() => void>();
export const setRelease = (r: Release | null) => {
  current = r;
  loaded = true;
  listeners.forEach((l) => l());
};
export async function refreshRelease() {
  try {
    setRelease(await api.release());
  } catch {
    /* an editor without the route: no chip */
  }
}
export const useRelease = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      if (!loaded) void refreshRelease();
      return () => listeners.delete(l);
    },
    () => current,
  );

const hm = (ms: number) => new Date(ms).toLocaleString("en-ZA", { weekday: "short", hour: "2-digit", minute: "2-digit" });
const when = (ms: number) => new Date(ms).toLocaleString("en-ZA", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Opened now and then: loads on first use.
const ScheduleDialog = lazy(() => import("./ScheduleDialog").then((m) => ({ default: m.ScheduleDialog })));

// ------------------------------------------------------------ Publish's menu

export function PublishMenu({ canPromote }: { canPromote: boolean }) {
  const [at, setAt] = useState<Anchor | null>(null);
  const [scheduling, setScheduling] = useState(false);
  return (
    <>
      <button type="button" className="ed-btn ed-btn-accent ed-pill ed-publish-more" aria-label="More ways to publish" aria-haspopup="menu" aria-expanded={!!at} onClick={(e) => setAt(at ? null : anchorOf(e.currentTarget))}>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {at ? (
        <Popover anchor={at} onClose={() => setAt(null)} className="ed-pop-menu" label="Publish options" width={220}>
          <ul role="menu" className="ed-release-menu">
            <li role="none">
              <button type="button" role="menuitem" onClick={() => (setAt(null), void publish())}>
                Publish now
              </button>
            </li>
            <li role="none">
              <button type="button" role="menuitem" disabled={!canPromote} title={canPromote ? undefined : "Scheduling needs the Manager role"} onClick={() => (setAt(null), setScheduling(true))}>
                Schedule…
              </button>
            </li>
            <li role="none">
              <button type="button" role="menuitem" onClick={() => (setAt(null), openSheet())}>
                Send to staging…
              </button>
            </li>
          </ul>
        </Popover>
      ) : null}
      {scheduling
        ? createPortal(
            <Suspense fallback={null}>
              <ScheduleDialog onClose={() => setScheduling(false)} />
            </Suspense>,
            document.body,
          )
        : null}
    </>
  );
}

// ------------------------------------------------------------ the chip

/** Shown while a release is scheduled, stopped, or live (with an end, or for a day after going live). */
export function ReleaseChip({ canPromote }: { canPromote: boolean }) {
  const r = useRelease();
  const [at, setAt] = useState<Anchor | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [staging, setStaging] = useState<string | null>(null);
  // Keep it fresh: the server changes it on its own (going live, ending).
  useEffect(() => {
    const t = setInterval(() => void refreshRelease(), 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (at && r?.state === "scheduled") void api.staging().then((s) => setStaging(s?.url ?? null), () => setStaging(null));
  }, [at, r?.state]);
  if (!r) return null;
  const recent = r.state === "live" && (r.endAt || (r.liveAt && Date.now() - r.liveAt < 86_400_000));
  if (r.state !== "scheduled" && r.state !== "blocked" && !recent) return null;
  const text = r.state === "scheduled" ? `Scheduled · ${when(r.goLiveAt)}` : r.state === "blocked" ? "Release stopped" : r.endAt ? `Live · ends ${when(r.endAt)}` : "Released";
  // Phones: just the time (or a word), so Publish keeps its place.
  const short = r.state === "scheduled" ? hm(r.goLiveAt) : r.state === "blocked" ? "Stopped" : r.endAt ? `Ends ${hm(r.endAt)}` : "Released";
  const act = async (fn: () => Promise<Release | null>) => {
    setNote(null);
    try {
      setRelease(await fn());
      setAt(null);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "That didn't work.");
    }
  };
  return (
    <>
      <button type="button" className={`ed-btn ed-release-chip is-${r.state}`} aria-haspopup="dialog" aria-expanded={!!at} onClick={(e) => setAt(at ? null : anchorOf(e.currentTarget))}>
        <span className="ed-release-long">{text}</span>
        <span className="ed-release-short" aria-hidden="true">
          {short}
        </span>
      </button>
      {at ? (
        <Popover anchor={at} onClose={() => setAt(null)} label="Release" width={280} className="ed-release-pop">
          <b>{r.label}</b>
          <p>
            {r.state === "scheduled"
              ? `Goes live ${when(r.goLiveAt)}${r.endAt ? `, ends ${when(r.endAt)}` : ""}.`
              : r.state === "blocked"
                ? (r.note ?? "It didn't go live.")
                : `Went live ${r.liveAt ? when(r.liveAt) : ""}${r.endAt ? `; ends ${when(r.endAt)}` : ""}.`}
          </p>
          {staging && r.state === "scheduled" ? (
            <a href={staging} target="_blank" rel="noreferrer">
              Preview what goes live
            </a>
          ) : null}
          {note ? <p className="ed-note">{note}</p> : null}
          {canPromote ? (
            <div className="ed-release-actions">
              {r.state === "live" ? (
                <Button variant="danger" onClick={() => void act(api.undoRelease)}>
                  Undo release
                </Button>
              ) : (
                <Button onClick={() => void act(api.cancelRelease)}>{r.state === "blocked" ? "Dismiss" : "Cancel release"}</Button>
              )}
            </div>
          ) : null}
        </Popover>
      ) : null}
    </>
  );
}
