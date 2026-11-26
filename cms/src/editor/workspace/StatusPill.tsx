import { useState } from "react";
import { anchorOf, Popover, type Anchor } from "../ui/Popover";
import { DEMO } from "../demo";
import { ClaudePill } from "../parts";
import { openSheet } from "./publish";

/**
 * One status for the page (direction A, Nov 2026): saved, how much isn't live yet, and the live
 * connection, in a single pill. Click it for the details: when it last saved, what's not live
 * (with the list), live sync, and whether Claude can reach the editor.
 */
export function StatusPill({ save, saveTitle, savedText, count, live }: { save: "saved" | "saving" | "error"; saveTitle: string; savedText: string; count: number | null; live: boolean }) {
  const [at, setAt] = useState<Anchor | null>(null);
  const state = save === "error" ? "is-error" : save === "saving" ? "is-saving" : count ? "is-draft" : count === 0 ? "is-live" : "is-draft";
  const text = save === "error" ? "Not saved" : save === "saving" ? "Saving…" : count ? `Draft · ${count} ${count === 1 ? "change" : "changes"}` : count === 0 ? "Live" : "Draft";
  return (
    <>
      <button
        type="button"
        className={`ed-statechip ${state}${live ? "" : " is-offline"}`}
        title={`${saveTitle}${live ? "" : " Reconnecting to live sync…"}`}
        aria-haspopup="dialog"
        aria-expanded={!!at}
        onClick={(e) => setAt(at ? null : anchorOf(e.currentTarget))}
      >
        <span aria-hidden="true" />
        {text}
      </button>
      {at ? (
        <Popover anchor={at} onClose={() => setAt(null)} label="Status" width={300} className="ed-status-pop">
          <dl>
            <dt>Saved</dt>
            <dd className={save === "error" ? "is-bad" : undefined}>{save === "error" ? "Not saved" : save === "saving" ? "Saving…" : savedText}</dd>
            <dt>Not live yet</dt>
            <dd>
              {count ? (
                <button
                  type="button"
                  onClick={() => {
                    setAt(null);
                    openSheet();
                  }}
                >
                  {count} {count === 1 ? "change" : "changes"} · see them
                </button>
              ) : count === 0 ? (
                "Nothing: the site matches"
              ) : (
                "Some changes"
              )}
            </dd>
            <dt>Live sync</dt>
            <dd className={live ? undefined : "is-bad"}>{live ? "Connected" : "Reconnecting…"}</dd>
            {DEMO ? null : (
              <>
                <dt>Claude</dt>
                <dd>
                  <ClaudePill />
                </dd>
              </>
            )}
          </dl>
        </Popover>
      ) : null}
    </>
  );
}
