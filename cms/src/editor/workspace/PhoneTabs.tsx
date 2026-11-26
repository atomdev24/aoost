import { useState } from "react";
import { activateBreakpoint } from "../board/bridge";
import { setFrameHidden } from "../board/store";
import { openPalette } from "../commands/palette-store";
import { DEMO } from "../demo";
import { useEditor } from "../store";
import { useSimple } from "./mode";
import { togglePanel, useRail, type PanelId } from "./rail-store";

/**
 * Phone 1 (Nov 2026): tools at the bottom where thumbs are. Add, Layers, Pages and Media open
 * their panel as a half-height sheet above the tabs; More holds the rest (comments, screen
 * size, search, the site-wide panels).
 */
const TABS: { id: PanelId | "more"; label: string; d: string }[] = [
  { id: "insert", label: "Add", d: "M10 4v12M4 10h12" },
  { id: "layers", label: "Layers", d: "M3 6l7-3.5L17 6l-7 3.5zM3 10.5l7 3.5 7-3.5M3 14.5l7 3.5 7-3.5" },
  { id: "pages", label: "Pages", d: "M5 2.5h6.5L15 6v11.5H5zM11 2.5V6h4" },
  { id: "media", label: "Media", d: "M3 4h14v12H3zM3 13l4-4 3 3 2-2 5 5" },
  { id: "more", label: "More", d: "M5 10h.01M10 10h.01M15 10h.01" },
];
const SITE: { id: PanelId; label: string }[] = [
  { id: "nav", label: "Navigation" },
  { id: "theme", label: "Theme" },
  { id: "fonts", label: "Fonts" },
  { id: "global", label: "Shared blocks" },
  { id: "history", label: "History" },
];

export function PhoneTabs() {
  const active = useRail((s) => s.active);
  const bp = useEditor((s) => s.bp);
  const simple = useSimple();
  const [more, setMore] = useState(false);
  const open = (id: PanelId) => {
    setMore(false);
    if (active !== id) togglePanel(id);
  };
  const tab = (id: PanelId | "more") => {
    if (id === "more") {
      if (active) togglePanel(active);
      setMore(!more);
      return;
    }
    setMore(false);
    togglePanel(id);
  };
  return (
    <>
      {more ? (
        <div className="ed-phone-more" role="dialog" aria-label="More">
          <span className="ed-phone-grip" aria-hidden="true" />
          <div className="ed-phone-more-head">
            <b>More</b>
            <button type="button" onClick={() => setMore(false)}>
              Done
            </button>
          </div>
          <div className="ed-seg ed-phone-bps" role="radiogroup" aria-label="Screen size">
            {(["desktop", "mobile"] as const).map((b) => (
              <button
                key={b}
                type="button"
                role="radio"
                aria-checked={bp === b}
                onClick={() => {
                  setFrameHidden(b, false);
                  activateBreakpoint(b);
                }}
              >
                {b === "desktop" ? "Desktop" : "Phone"}
              </button>
            ))}
          </div>
          <ul>
            <li>
              <button type="button" onClick={() => open("comments")}>
                Comments
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setMore(false);
                  openPalette();
                }}
              >
                Search and commands
              </button>
            </li>
            {simple
              ? null
              : SITE.filter((s) => !(DEMO && s.id === "history")).map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => open(s.id)}>
                      {s.label}
                    </button>
                  </li>
                ))}
          </ul>
        </div>
      ) : null}
      <nav className="ed-phone-tabs" aria-label="Tools">
        {TABS.map((t) => {
          const on = t.id === "more" ? more : active === t.id;
          return (
            <button key={t.id} type="button" aria-pressed={on} onClick={() => tab(t.id)}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={t.id === "more" ? 3 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={t.d} />
              </svg>
              {t.label}
            </button>
          );
        })}
      </nav>
    </>
  );
}
