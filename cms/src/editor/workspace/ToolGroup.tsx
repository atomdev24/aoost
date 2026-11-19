import { useEffect, useRef, useState } from "react";
import { getComponent } from "../../components/registry";
import { locate } from "../../model/page-ops";
import { applyTool, setToolListener } from "../board/keys";
import { TOOLS, type Tool } from "../board/tools";
import { currentPage, useEditor } from "../store";

/**
 * The segmented tool group in the middle of the top bar. Select is the
 * resting tool; Frame, Section, Text and Image add one block next to the
 * selection and select it; Ask Claude explains how to hand Claude the selection.
 */
export function ToolGroup() {
  const [flash, setFlash] = useState<Tool | null>(null);
  const [asking, setAsking] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setToolListener((tool) => {
      if (tool === "claude") setAsking((a) => !a);
      else {
        setAsking(false);
        setFlash(tool);
        setTimeout(() => setFlash(null), 350);
      }
    });
    return () => setToolListener(null);
  }, []);

  useEffect(() => {
    if (!asking) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setAsking(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [asking]);

  return (
    <div className="ed-tools-wrap" ref={box}>
      <div className="ed-tools" role="toolbar" aria-label="Tools">
        {TOOLS.map((t) => {
          const pressed = t.id === "claude" ? asking : t.id === "select" ? !flash && !asking : flash === t.id;
          return (
            <button key={t.id} type="button" className="ed-tool" data-tool={t.id} aria-label={t.label} aria-pressed={pressed} title={t.key ? `${t.label} (${t.key})` : t.label} onClick={() => applyTool(t.id)}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={t.icon} />
              </svg>
            </button>
          );
        })}
      </div>
      {asking ? <AskClaude /> : null}
    </div>
  );
}

function AskClaude() {
  const page = useEditor(currentPage);
  const selected = useEditor((s) => s.selection[0]);
  const at = selected ? locate(page, selected) : null;
  const name = at ? (at.kind === "section" ? (at.section.name ?? "a section") : (at.node.name ?? getComponent(at.node.type)?.label ?? at.node.type)) : null;
  return (
    <div className="ed-popover" role="dialog" aria-label="Ask Claude">
      <strong>Ask Claude</strong>
      <p>Claude edits this draft through the editor's connector and sees what you have selected here.</p>
      <p>{name ? `Selected: ${name} on ${page.title}. In Claude, ask about "the selected block".` : "Select a block first, then ask Claude about \"the selected block\"."}</p>
      <p className="ed-hint">Changes from Claude appear here live, and Undo takes them back.</p>
    </div>
  );
}
