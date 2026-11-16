import { AutoField } from "@puckeditor/core";
import { contentFields } from "../../components/fields";
import { getComponent } from "../../components/registry";
import { globalUses, removeGlobal, updateGlobal } from "../../model/library";
import { ResponsiveEditor } from "../fields/ResponsiveEditor";
import { STYLE_ROWS } from "../fields/rows";
import { setGlobalEdit, update, useEditor } from "../store";
import { Button, Row, TextInput } from "./kit";

/** Edit a global component once; every place that uses it updates. */
export function GlobalPanel({ globalId }: { globalId: string }) {
  const site = useEditor((s) => s.site);
  const global = site.globals.find((g) => g.id === globalId);
  if (!global) return null;
  const def = getComponent(global.node.type);
  const uses = globalUses(site, globalId);
  return (
    <div className="ed-side">
      <header className="ed-side-head">
        <div>
          <h3>Global: {global.name}</h3>
          <span>
            {def?.label ?? global.node.type} · used in {uses} {uses === 1 ? "place" : "places"}
          </span>
        </div>
        <button type="button" className="ed-icon" aria-label="Close global component" onClick={() => setGlobalEdit(null)}>
          ×
        </button>
      </header>
      <div className="ed-side-body">
        <Row label="Name">
          <TextInput ariaLabel="Global name" value={global.name} onCommit={(name) => name && update((s) => updateGlobal(s, globalId, (n) => n, name), "Rename global")} />
        </Row>
        <h5 className="ed-subhead">Content</h5>
        <div className="ed-autofields">
          {Object.entries(contentFields[global.node.type] ?? {}).map(([key, field]) => (
            <AutoField
              key={key}
              field={field}
              value={global.node.content[key]}
              onChange={(value: unknown) => update((s) => updateGlobal(s, globalId, (n) => ({ ...n, content: { ...n.content, [key]: value } })), `Edit global ${global.name}`, { merge: `global:${globalId}:${key}` })}
            />
          ))}
        </div>
        <ResponsiveEditor
          value={global.node.style}
          onChange={(style) => update((s) => updateGlobal(s, globalId, (n) => ({ ...n, style })), `Style global ${global.name}`, { merge: `global:${globalId}:style` })}
          rows={STYLE_ROWS}
          ctx={{ parentKind: "flow", framed: !!def?.framed }}
        />
        <Button
          onClick={() => {
            update((s) => removeGlobal(s, globalId), `Delete global ${global.name}`);
            setGlobalEdit(null);
          }}
          title="Every place that uses it keeps its own copy"
        >
          Delete global (pages keep a copy)
        </Button>
      </div>
    </div>
  );
}
