import { lazy, Suspense, useEffect, useState } from "react";
import "../components/registry";
import { api } from "./api";
import { Editor } from "./Editor";
import { capturePreview } from "./screenshot";
import { noteVersion, onServerMessage, startSync } from "./socket";
import { startProblemLog } from "./problems";
import { flush, getState, initStore, setOnSaved } from "./store";
import { startSyncNotices } from "./workspace/sync";

/** The phone quick editor (?quick) is its own screen: it loads only when asked for. */
const QuickEdit = lazy(() => import("./QuickEdit").then((m) => ({ default: m.QuickEdit })));

/**
 * Phones get the full editor too (adapted for touch). The older quick-edit
 * form is still there at /admin/?quick for a plain list of fields.
 */
const quick = new URLSearchParams(location.search).has("quick");

export function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.site(), api.state()])
      .then(([{ site }, state]) => {
        performance.mark("aoost:draft");
        initStore(site, state.dirty);
        setOnSaved(noteVersion);
        startSync();
        startProblemLog();
        startSyncNotices(state.sync);
        // Claude asked to see a page: capture the draft preview here and send it back.
        onServerMessage((msg) => {
          if (msg.type !== "screenshot-request") return;
          const page = getState().site.pages.find((p) => p.id === msg.pageId);
          void flush()
            .then(() => (page ? capturePreview(page.slug, msg.breakpoint) : Promise.reject(new Error("no such page"))))
            .then((png) => fetch("/api/editor/screenshot", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: msg.requestId, png }) }))
            .catch((e) => fetch("/api/editor/screenshot", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: msg.requestId, png: null, error: String(e) }) }));
        });
        setReady(true);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <div className="ed-splash">Could not load the draft: {error}</div>;
  if (!ready) return <div className="ed-splash">Loading the draft…</div>;
  return quick ? (
    <Suspense fallback={<div className="ed-splash">Loading…</div>}>
      <QuickEdit />
    </Suspense>
  ) : (
    <Editor />
  );
}
