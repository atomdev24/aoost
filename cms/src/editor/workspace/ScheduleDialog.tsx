import { useState } from "react";
import { api } from "../api";
import { Button, Modal } from "../ui/kit";
import { setRelease, useRelease } from "./Release";

const local = (ms: number) => {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
};

/** Schedule what's in the draft: it goes to staging now and live at the time chosen (Publish ▾ → Schedule…). */
export function ScheduleDialog({ onClose }: { onClose: () => void }) {
  const r = useRelease();
  const editing = r?.state === "scheduled" ? r : null;
  const tomorrow9 = (() => {
    const d = new Date(Date.now() + 86_400_000);
    d.setHours(9, 0, 0, 0);
    return d.getTime();
  })();
  const [label, setLabel] = useState(editing?.label ?? "");
  const [goLive, setGoLive] = useState(local(editing?.goLiveAt ?? tomorrow9));
  const [ends, setEnds] = useState(!!editing?.endAt);
  const [end, setEnd] = useState(local(editing?.endAt ?? tomorrow9 + 7 * 86_400_000));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const name = label.trim() || "Release";
      // What goes live is the draft as it is now: frozen in staging, with its share link.
      await api.sendToStaging(name);
      setRelease(await api.scheduleRelease({ label: name, goLiveAt: new Date(goLive).getTime(), endAt: ends ? new Date(end).getTime() : undefined }));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't schedule it.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Schedule a release" onClose={onClose}>
      <div className="ed-team ed-release-form">
        <p className="ed-hint">The draft as it is now goes live at the time you choose. Changes you make after this stay in the draft until you publish or schedule again.</p>
        <label className="ed-field">
          <span className="ed-field-label">Name</span>
          <input className="ed-input" value={label} placeholder="Berlin launch" onChange={(e) => setLabel(e.target.value)} />
        </label>
        <label className="ed-field">
          <span className="ed-field-label">Goes live</span>
          <input className="ed-input" type="datetime-local" value={goLive} onChange={(e) => setGoLive(e.target.value)} />
        </label>
        <label className="ed-demo-row" style={{ borderTop: 0, padding: 0 }}>
          <span>
            <b>Ends</b>
            <small>Puts back what was live before, at this time. Campaign pages with an end date end by themselves too.</small>
          </span>
          <input type="checkbox" role="switch" checked={ends} onChange={(e) => setEnds(e.target.checked)} />
        </label>
        {ends ? (
          <label className="ed-field">
            <span className="ed-field-label">Ends</span>
            <input className="ed-input" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        ) : null}
        {error ? (
          <p className="ed-note" role="alert">
            {error}
          </p>
        ) : null}
        <div className="ed-demo-actions" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="accent" onClick={() => void submit()} disabled={busy}>
            {busy ? "Scheduling…" : editing ? "Update schedule" : "Schedule"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

