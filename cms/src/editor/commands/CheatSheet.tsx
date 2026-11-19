import { useEffect } from "react";
import { closeCheatSheet, usePalette } from "./palette-store";
import { GROUPS } from "./registry";
import { keyLabels, SHORTCUTS } from "./shortcuts";

/** Every shortcut by group, on a frosted overlay (? or the palette). Esc, ? or a click outside closes it. */
export function CheatSheet() {
  const open = usePalette((s) => s.cheat);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      closeCheatSheet();
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [open]);
  if (!open) return null;
  return (
    <div className="ed-pal-backdrop ed-cheat-backdrop" onPointerDown={(e) => e.target === e.currentTarget && closeCheatSheet()}>
      <div className="ed-cheat" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
        <header className="ed-cheat-head">
          <strong>Keyboard shortcuts</strong>
          <button type="button" className="ed-mini" aria-label="Close" onClick={closeCheatSheet}>
            ✕
          </button>
        </header>
        <div className="ed-cheat-groups">
          {GROUPS.map((g) => (
            <section key={g} className="ed-cheat-group" aria-label={g}>
              <h3>{g}</h3>
              <dl>
                {SHORTCUTS.filter((s) => s.group === g).map((s) => (
                  <div key={s.id} className="ed-cheat-row">
                    <dt>{s.label}</dt>
                    <dd>
                      {keyLabels(s).map((k) => (
                        <kbd key={k}>{k}</kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <footer className="ed-cheat-foot">Single keys never fire while you type in a field. On Windows, ⌘ is Ctrl.</footer>
      </div>
    </div>
  );
}
