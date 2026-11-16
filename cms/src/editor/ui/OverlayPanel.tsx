import { AutoField } from "@puckeditor/core";
import { contentFields } from "../../components/fields";
import { getComponent } from "../../components/registry";
import { duplicate, remove, updateNode, updateOverlay } from "../../model/page-ops";
import type { Overlay } from "../../schema";
import { ResponsiveEditor } from "../fields/ResponsiveEditor";
import { OVERLAY_ROWS, STYLE_ROWS } from "../fields/rows";
import { currentPage, setOverlay, updatePage, useEditor } from "../store";
import { Button, NumberInput, Row, Select, Toggle } from "./kit";

/** Settings for the selected overlay: where it hangs, what it shows, how it looks. */
export function OverlayPanel({ overlayId }: { overlayId: string }) {
  const page = useEditor(currentPage);
  const overlay = page.overlays.find((o) => o.id === overlayId);
  if (!overlay) return null;
  const def = getComponent(overlay.node.type);
  const change = (fn: (o: Overlay) => Overlay, label = "Edit overlay") => updatePage(page.id, (p) => updateOverlay(p, overlayId, fn), label, { merge: `overlay:${overlayId}` });
  const anchorValue = overlay.anchor === "viewport" ? "viewport" : overlay.anchor.sectionId;

  return (
    <div className="ed-side">
      <header className="ed-side-head">
        <div>
          <h3>Overlay</h3>
          <span>{overlay.node.name ?? def?.label ?? overlay.node.type}</span>
        </div>
        <button type="button" className="ed-icon" aria-label="Close overlay settings" onClick={() => setOverlay(null)}>
          ×
        </button>
      </header>
      <div className="ed-side-body">
        <Row label="Attach to">
          <Select
            ariaLabel="Attach to"
            value={anchorValue}
            options={[{ value: "viewport", label: "The screen (floats)" }, ...page.sections.map((s, i) => ({ value: s.id, label: `Section: ${s.name ?? i + 1}` }))]}
            onChange={(v) => v && change((o) => ({ ...o, anchor: v === "viewport" ? "viewport" : { sectionId: v, edge: o.anchor === "viewport" ? "top" : o.anchor.edge } }))}
          />
        </Row>
        {overlay.anchor !== "viewport" ? (
          <Row label="Straddles">
            <Select
              ariaLabel="Section edge"
              value={overlay.anchor.edge}
              options={[
                { value: "top", label: "Top edge" },
                { value: "bottom", label: "Bottom edge" },
              ]}
              onChange={(edge) => edge && change((o) => (o.anchor === "viewport" ? o : { ...o, anchor: { ...o.anchor, edge } }))}
            />
          </Row>
        ) : null}
        {overlay.anchor !== "viewport" ? (
          <Row label="Stick while scrolling">
            <Toggle label="Stick while scrolling" checked={!!overlay.sticky} onChange={(sticky) => change((o) => ({ ...o, sticky: sticky || undefined }))} />
          </Row>
        ) : null}
        <Row label="Stacking order">
          <NumberInput ariaLabel="Stacking order" value={overlay.z} step={1} onCommit={(z) => change((o) => ({ ...o, z: Math.round(z ?? 5) }))} />
        </Row>
        <ResponsiveEditor value={overlay.place} onChange={(place) => change((o) => ({ ...o, place }))} rows={overlay.anchor === "viewport" ? OVERLAY_ROWS : OVERLAY_ROWS.filter((r) => r.key !== "v")} />

        <h5 className="ed-subhead">Content</h5>
        <div className="ed-autofields">
          {Object.entries(contentFields[overlay.node.type] ?? {}).map(([key, field]) => (
            <AutoField
              key={key}
              field={field}
              value={overlay.node.content[key]}
              onChange={(value: unknown) => updatePage(page.id, (p) => updateNode(p, overlay.node.id, (n) => ({ ...n, content: { ...n.content, [key]: value } })), "Edit overlay", { merge: `overlay:${overlayId}:${key}` })}
            />
          ))}
        </div>
        <ResponsiveEditor
          value={overlay.node.style}
          onChange={(style) => updatePage(page.id, (p) => updateNode(p, overlay.node.id, (n) => ({ ...n, style })), "Style overlay", { merge: `overlay:${overlayId}:style` })}
          rows={STYLE_ROWS.filter((r) => !["hidden"].includes(r.key) || true)}
          ctx={{ parentKind: "flow", framed: !!def?.framed }}
        />
        <div className="ed-two">
          <Button onClick={() => updatePage(page.id, (p) => duplicate(p, overlayId), "Duplicate overlay")}>Duplicate</Button>
          <Button
            onClick={() => {
              updatePage(page.id, (p) => remove(p, overlayId), "Delete overlay");
              setOverlay(null);
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
