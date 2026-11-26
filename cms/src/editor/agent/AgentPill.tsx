import { useAgent } from "./store";

/** Claude's spark, drawn simply (no brand artwork): four rounded rays. */
const Spark = () => (
  <svg className="ed-agent-spark" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 1.5c.5 3.200 1.300 4 4.500 4.500-3.200.5-4 1.300-4.500 4.500-.5-3.200-1.300-4-4.500-4.500C6.700 5.500 7.500 4.700 8 1.500z" fill="currentColor" />
    <circle cx="12.5" cy="12.5" r="1.200" fill="currentColor" opacity=".7" />
  </svg>
);

/**
 * "Claude · Changing a block": shows while Claude works through the connector, then "finished"
 * for a few seconds. A thin moving line along the top of the editor says the same at a glance.
 */
export function AgentPill() {
  const a = useAgent();
  if (a.state === "idle") return null;
  const working = a.state === "working";
  return (
    <>
      {working ? <span className="ed-agent-sheen" aria-hidden="true" /> : null}
      <span className={`ed-agent-pill${working ? " is-working" : " is-done"}`} role="status" aria-live="polite" title={working ? "Claude is working on the draft. You can keep editing; its changes undo like yours." : "Claude finished. ⌘Z undoes its changes."}>
        {working ? <Spark /> : <span aria-hidden="true">✓</span>}
        <b>Claude</b>
        <span className="ed-agent-text">{working ? a.text : `Finished${a.text && a.text !== "Finished" ? ` · ${a.text}` : ""}`}</span>
      </span>
    </>
  );
}
