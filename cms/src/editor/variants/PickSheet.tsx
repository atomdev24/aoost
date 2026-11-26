import { useEffect, useState } from "react";
import { ownerPage, versionsOf } from "../../model/variants";
import { DEMO } from "../demo";
import { useEditor } from "../store";
import { useCan } from "../team/role";
import { closeDesigns } from "../templates/designs-open";
import { pick } from "./actions";
import { closePick, setPickDone, usePickDone, usePickOpen } from "./pick-open";
import "./variants.css";

const STEPS = [
  { name: "Draft", hint: "Anyone makes a variant" },
  { name: "Proposed", hint: "The team votes and comments" },
  { name: "Picked", hint: "A manager chooses" },
  { name: "Staging", hint: "A link to share" },
  { name: "Live", hint: "Push to production" },
];

const keptLine = (names: string[]) =>
  names.length === 1
    ? `${names[0]} moves to Earlier versions, with its votes and comments, so you can bring it back.`
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} move to Earlier versions, with their votes and comments, so you can bring any of them back.`;

/**
 * Pick a version: it replaces the page in the draft, and nothing is thrown away (the page as it was
 * and the other variants become earlier versions). Then send to staging, or just pick. A live test
 * against the page (A/B) is shown as coming later.
 */
export function PickSheet() {
  const id = usePickOpen();
  const site = useEditor((s) => s.site);
  const canPick = useCan("promote");
  const [then, setThen] = useState<"staging" | "none">("staging");
  const [busy, setBusy] = useState(false);
  const done = usePickDone();
  useEffect(() => setBusy(false), [id]);
  useEffect(() => {
    if (!id) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      closePick();
    };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [id]);
  if (!id) return null;
  const picked = site.pages.find((p) => p.id === id);
  if (!picked && !done) return null;
  const page = picked ? ownerPage(site, picked) : null;
  const keeping = !!picked && !!page && picked.id === page.id;
  const others = page ? versionsOf(site, page.id).filter((p) => p.id !== id) : [];
  const name = picked ? (keeping ? `${picked.title} as it is` : (picked.variantName ?? "this variant")) : (done?.name ?? "");

  const go = async () => {
    setBusy(true);
    const r = await pick(id, then);
    setBusy(false);
    setPickDone({ ...r, name, staging: then === "staging" });
    if (r.ok) closeDesigns();
  };

  return (
    <div className="ed-backdrop vp-backdrop" onPointerDown={(e) => e.target === e.currentTarget && closePick()}>
      <section className="vp" role="dialog" aria-modal="true" aria-label={`Pick ${name}`}>
        {done ? (
          <>
            <span className="vp-kicker">{done.ok ? "Picked" : "Couldn't pick"}</span>
            <h2>{done.ok ? `${done.name} is now the page in the draft.` : "Something went wrong. Nothing changed."}</h2>
            {done.ok ? <p className="vp-text">The other versions are kept under Earlier versions in the page's versions list.</p> : null}
            {done.link ? (
              <p className="vp-text">
                {DEMO ? "On a share link until the demo resets: " : "On the staging link: "}
                <a href={done.link} target="_blank" rel="noopener">
                  {done.link.replace(/^https?:\/\//, "")}
                </a>
              </p>
            ) : done.ok && done.staging ? (
              <p className="vp-text">Sending to staging didn't work; try again from Publish.</p>
            ) : null}
            <div className="vp-actions">
              <button type="button" className="ed-btn ed-btn-accent" onClick={closePick}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="vp-kicker">Pick a version</span>
            <h2>{keeping ? `Keep ${picked!.title} as it is?` : `Make ${name} the ${page!.title} page?`}</h2>
            <p className="vp-text">
              {keeping
                ? "The variants are filed under Earlier versions, so the board shows only the page. You can bring any of them back."
                : `Its content replaces ${page!.title} in the draft. ${page!.title} keeps its address, title and place in the menu. Nothing goes live until it's sent on from staging.`}
            </p>
            <ol className="vp-steps" aria-label="Where this is in the process">
              {STEPS.map((s, i) => (
                <li key={s.name} className={i <= 2 ? "is-done" : ""}>
                  <span className="vp-bar" />
                  <b>{s.name}</b>
                  <small>{s.hint}</small>
                </li>
              ))}
            </ol>
            {others.length && !keeping ? (
              <div className="vp-kept">
                <b>The other versions are kept</b>
                <span>{keptLine([`${page!.title} as it is now`, ...others.filter((o) => o.id !== page!.id).map((o) => o.variantName ?? "Variant")])}</span>
              </div>
            ) : null}
            <fieldset className="vp-then">
              <legend>After picking</legend>
              <label>
                <input type="radio" name="vp-then" checked={then === "staging"} onChange={() => setThen("staging")} />
                <span>
                  <b>Send to staging</b>
                  <small>Freezes the draft into the staging link to share. Push to production from there.</small>
                </span>
              </label>
              <label>
                <input type="radio" name="vp-then" checked={then === "none"} onChange={() => setThen("none")} />
                <span>
                  <b>Just pick it</b>
                  <small>It's the page in the draft; send to staging when you're ready.</small>
                </span>
              </label>
              <label className="is-later">
                <input type="radio" name="vp-then" disabled />
                <span>
                  <b>
                    Test it live against the page <em>Later</em>
                  </b>
                  <small>Half the visitors see each; Visitor insights shows which keeps people longer. Pick the winner afterwards.</small>
                </span>
              </label>
            </fieldset>
            <div className="vp-actions">
              <button type="button" className="ed-btn" onClick={closePick}>
                Cancel
              </button>
              <button type="button" className="ed-btn ed-btn-variant" disabled={busy || !canPick} title={canPick ? undefined : "Picking needs the Manager role"} onClick={() => void go()}>
                {busy ? "Picking…" : keeping ? "Keep it as it is" : `Pick ${name}`}
              </button>
            </div>
            {!canPick ? <p className="vp-note">Only Managers and Owners can pick. Vote and comment so they know what you think.</p> : null}
          </>
        )}
      </section>
    </div>
  );
}
