import { useState } from "react";
import { getComponent } from "../../components/registry";
import { detachGlobal, globalUses, insertTemplate, makeGlobal, removeTemplate, saveTemplate, STARTER_TEMPLATES } from "../../model/library";
import { locate } from "../../model/page-ops";
import { currentPage, getState, setGlobalEdit, update, useEditor } from "../store";

/**
 * Library: global components (edit once, update everywhere) and templates
 * (save a section or a whole page, reuse it anywhere).
 */
export function LibraryPanel({ mode = "all" }: { mode?: "all" | "globals" | "templates" }) {
  const site = useEditor((s) => s.site);
  const page = useEditor(currentPage);
  const selectedId = useEditor((s) => s.selection[0]);
  const editing = useEditor((s) => s.globalId);
  const [name, setName] = useState("");

  const at = selectedId ? locate(page, selectedId) : null;
  const selectedNode = at && at.kind === "node" ? at.node : null;
  const selectedSection = at ? (at.kind === "section" ? at.section : at.kind === "node" ? at.section : null) : null;
  const takeName = (fallback: string) => {
    const value = name.trim() || fallback;
    setName("");
    return value;
  };

  const showGlobals = mode === "all" || mode === "globals";
  const showTemplates = mode === "all" || mode === "templates";

  return (
    <div className="ed-panel ed-theme">
      {showGlobals ? (
        <>
          <div className="ed-panel-head">
            <span className="ed-caps">Global components</span>
          </div>
          <ul className="ed-layers">
            {site.globals.map((g) => (
              <li key={g.id} className={`ed-layer${editing === g.id ? " is-selected" : ""}`} style={{ paddingLeft: 8 }}>
                <button type="button" className="ed-layer-name" onClick={() => setGlobalEdit(g.id)} title="Edit this global component">
                  <span>{g.name}</span>
                  <small>
                    {getComponent(g.node.type)?.label ?? g.node.type} · {globalUses(site, g.id)}×
                  </small>
                </button>
              </li>
            ))}
            {!site.globals.length ? <li className="ed-empty">No global components yet.</li> : null}
          </ul>
          <div className="ed-panel-foot">
            <p className="ed-hint">To place one, drag "Global component" in from Add and choose it. Editing it here changes it on every page.</p>
            <input className="ed-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name for a new global or template" aria-label="Name for a new global or template" />
            <button
              type="button"
              className="ed-btn ed-btn-ghost"
              disabled={!selectedNode || selectedNode.type === "Global"}
              onClick={() => {
                if (!selectedNode) return;
                let made: string | null = null;
                update((s) => {
                  const result = makeGlobal(s, getState().pageId, selectedNode.id, takeName(getComponent(selectedNode.type)?.label ?? "Global"));
                  made = result?.globalId ?? null;
                  return result?.site ?? s;
                }, "Make global component");
                if (made) setGlobalEdit(made);
              }}
            >
              Make the selected layer global
            </button>
            <button type="button" className="ed-btn ed-btn-ghost" disabled={selectedNode?.type !== "Global"} onClick={() => selectedNode && update((s) => detachGlobal(s, getState().pageId, selectedNode.id), "Detach from global")}>
              Detach the selected copy
            </button>
          </div>
        </>
      ) : null}

      {showTemplates ? (
        <>
          <div className="ed-panel-head">
            <span className="ed-caps">Templates</span>
          </div>
          <ul className="ed-layers">
            {site.templates.map((t) => (
              <li key={t.id} className="ed-layer" style={{ paddingLeft: 8 }}>
                <button type="button" className="ed-layer-name" onClick={() => update((s) => insertTemplate(s, getState().pageId, t.id), `Insert template ${t.name}`)} title="Add this template's sections to the end of the page">
                  <span>{t.name}</span>
                  <small>
                    {t.kind === "page" ? "Page" : "Section"} · {t.sections.length} {t.sections.length === 1 ? "section" : "sections"}
                  </small>
                </button>
                {STARTER_TEMPLATES.includes(t.id) ? null : (
                  <button type="button" className="ed-mini" aria-label={`Delete template ${t.name}`} onClick={() => update((s) => removeTemplate(s, t.id), `Delete template ${t.name}`)}>
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="ed-panel-foot">
            <p className="ed-hint">Click a template to add its sections to this page. Page templates also appear when you create a new page.</p>
            {!showGlobals ? (
              <input className="ed-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name for template" aria-label="Name for template" />
            ) : null}
            <button
              type="button"
              className="ed-btn ed-btn-ghost"
              disabled={!selectedSection}
              onClick={() => selectedSection && update((s) => saveTemplate(s, "section", takeName(selectedSection.name ?? "Section"), [selectedSection]).site, "Save section as template")}
            >
              Save the selected section as a template
            </button>
            <button type="button" className="ed-btn ed-btn-ghost" onClick={() => update((s) => saveTemplate(s, "page", takeName(page.title), currentPage(getState()).sections).site, "Save page as template")}>
              Save this page as a template
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
