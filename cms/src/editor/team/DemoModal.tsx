import { useEffect, useState } from "react";
import type { DemoReset, DemoSettings } from "../../model/demo-settings";
import { api } from "../api";
import { Button, Modal } from "../ui/kit";
import { useCan } from "./role";

const RESETS: { id: DemoReset; label: string; hint: string }[] = [
  { id: "nightly", label: "Every night", hint: "At 03:00 Cape Town time" },
  { id: "weekly", label: "Every week", hint: "Mondays at 03:00" },
  { id: "never", label: "Never", hint: "Only when you reset it" },
];

/**
 * The demo editor (/demo/), from the real editor: switch it on or off, choose how often it goes back
 * to its sample site, or reset it now. Managers and Owners can change it; everyone else can look.
 */
export function DemoModal({ onClose }: { onClose: () => void }) {
  const manager = useCan("promote");
  const [s, setS] = useState<DemoSettings | null>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    api
      .demoSettings()
      .then((r) => setS(r.settings))
      .catch((e: Error) => setNote(e.message));
  }, []);
  const save = async (next: DemoSettings) => {
    setS(next);
    setNote(null);
    try {
      setS((await api.putDemoSettings(next)).settings);
      setNote("Saved.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Couldn't save.");
    }
  };
  const reset = async () => {
    setNote(null);
    try {
      await api.resetDemo();
      setNote("The demo is back to its sample site.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Couldn't reset the demo.");
    }
  };
  const link = `${location.origin}/demo/`;
  return (
    <Modal title="Demo editor" onClose={onClose}>
      <div className="ed-team ed-demo-admin">
        <p className="ed-hint">
          A copy of the editor with a sample site, open to anyone with the link: <a href={link} target="_blank" rel="noreferrer">{link}</a>
        </p>
        {s ? (
          <>
            <label className="ed-demo-row">
              <span>
                <b>Open</b>
                <small>{s.enabled ? "Anyone with the link can use it." : "The link shows that the demo is off."}</small>
              </span>
              <input type="checkbox" role="switch" checked={s.enabled} disabled={!manager} onChange={(e) => void save({ ...s, enabled: e.target.checked })} />
            </label>
            <div className="ed-demo-row">
              <span>
                <b>Goes back to the sample site</b>
                <small>{RESETS.find((r) => r.id === s.reset)?.hint}</small>
              </span>
              <div className="ed-seg" role="radiogroup" aria-label="How often the demo resets">
                {RESETS.map((r) => (
                  <button key={r.id} type="button" role="radio" aria-checked={s.reset === r.id} disabled={!manager} onClick={() => void save({ ...s, reset: r.id })}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="ed-demo-row">
              <span>
                <b>Reset now</b>
                <small>Everyone in the demo sees the sample site again.</small>
              </span>
              <Button onClick={() => void reset()} disabled={!manager}>
                Reset now
              </Button>
            </div>
            <p className="ed-hint">Its pictures: mark them with Demo in the Media library.{manager ? "" : " Managers and Owners can change these settings."}</p>
          </>
        ) : null}
        {note ? <p className="ed-hint" role="status">{note}</p> : null}
      </div>
    </Modal>
  );
}
