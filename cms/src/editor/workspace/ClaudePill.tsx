import { useEffect, useState } from "react";
import { api } from "../api";

/**
 * Whether Claude can reach this editor. It shows "connected" only when the
 * connector has made an authenticated call recently; until it has working
 * credentials it says so, plainly.
 */
export function ClaudePill() {
  const [connected, setConnected] = useState<boolean | null>(null);
  useEffect(() => {
    let stop = false;
    const check = () =>
      api
        .claude()
        .then((r) => !stop && setConnected(r.connected))
        .catch(() => !stop && setConnected(false));
    void check();
    const t = setInterval(check, 60_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);
  const on = connected === true;
  return (
    <span
      className={`ed-pill${on ? " is-on" : ""}`}
      role="status"
      title={on ? "Claude has called the editor's connector in the last 15 minutes." : "The Claude connector has no working credentials yet, or hasn't been used in the last 15 minutes. See docs/auth.md."}
    >
      <span className="ed-pill-dot" aria-hidden="true" />
      <span className="ed-pill-text">{connected === null ? "Checking Claude…" : on ? "Claude connected" : "Claude not connected"}</span>
    </span>
  );
}
