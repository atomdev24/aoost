import { useEffect, useState } from "react";
import "../components/registry";
import { api } from "./api";
import { Editor } from "./Editor";
import { initStore } from "./store";

export function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.site(), api.state()])
      .then(([{ site }, state]) => {
        initStore(site, state.dirty);
        setReady(true);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <div className="ed-splash">Could not load the draft: {error}</div>;
  if (!ready) return <div className="ed-splash">Loading the draft…</div>;
  return <Editor />;
}
