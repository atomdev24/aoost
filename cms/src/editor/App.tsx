import { useEffect, useState } from "react";
import "../components/registry";
import { api } from "./api";
import { Editor } from "./Editor";
import { QuickEdit } from "./QuickEdit";
import { capturePreview } from "./screenshot";
import { noteVersion, onServerMessage, startSync } from "./socket";
import { flush, getState, initStore, setOnSaved } from "./store";
import { startSyncNotices } from "./workspace/sync";

/** Below this width the editor switches to quick edit (precise drag layout is desktop-only). */
const QUICK_BELOW = 900;

export function App() {
  const [ready, setReady] = useState(false);
  const [small, setSmall] = useState(() => window.innerWidth < QUICK_BELOW);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${QUICK_BELOW - 1}px)`);
    const onChange = () => setSmall(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.site(), api.state()])
      .then(([{ site }, state]) => {
        initStore(site, state.dirty);
        setOnSaved(noteVersion);
        startSync();
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
  return small ? <QuickEdit /> : <Editor />;
}
