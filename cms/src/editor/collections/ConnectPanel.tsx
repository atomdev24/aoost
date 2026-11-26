import "./collections.css";
import { z } from "zod";
import { contentFields } from "../../components/fields";
import { getComponent } from "../../components/registry";
import { collectionById, fieldsFor, setBinding } from "../../model/cms";
import { locate } from "../../model/page-ops";
import { currentPage, update, useEditor } from "../store";
import { openCollections } from "./collections-open";

/** Settings that are about look or layout, never about an entry's content. */
const SKIP = /^(styleId|tag|variant|color|align|height|look|bg|columns|layout|side|media|kind|region|portalId|formId|accent|ink|surface|shade|panel|.*Style|previewStage|play|autoplay|loop|controls|playInView|source|lightbox|markStyle|fit|newTab|embed|duration|avatar|channel)$/;

/** The content settings of a block that can take a field: text, numbers, on/off, pictures and links (not choices of look). */
function connectable(type: string, content: Record<string, unknown>): { key: string; label: string; value: unknown }[] {
  const shape = (getComponent(type)?.schema as unknown as { shape?: Record<string, z.ZodTypeAny> })?.shape ?? {};
  const fields = (contentFields[type] ?? {}) as Record<string, { label?: string }>;
  const out: { key: string; label: string; value: unknown }[] = [];
  for (const [key, value] of Object.entries(content)) {
    if (SKIP.test(key)) continue;
    const s = shape[key];
    const inner = s instanceof z.ZodOptional || s instanceof z.ZodDefault ? (s._def.innerType as z.ZodTypeAny) : s;
    if (inner instanceof z.ZodEnum || inner instanceof z.ZodArray) continue;
    const isTarget = value && typeof value === "object" && "kind" in (value as object);
    if (!(typeof value === "string" || typeof value === "number" || typeof value === "boolean" || isTarget)) continue;
    out.push({ key, label: fields[key]?.label ?? key, value });
  }
  return out;
}

/**
 * On a collection's page design, above the selected block's settings: connect each of its content
 * settings to a field of the collection, so every entry's page shows its own value there.
 */
export function ConnectPanel() {
  const page = useEditor(currentPage);
  const nodeId = useEditor((s) => s.selection[0]);
  const col = useEditor((s) => (page.collectionId ? collectionById(s.site, page.collectionId) : undefined));
  if (!col || !nodeId) return null;
  const at = locate(page, nodeId);
  const node = at && at.kind !== "section" ? at.node : null;
  if (!node) return null;
  const settings = connectable(node.type, node.content);
  if (!settings.length) return null;
  const connect = (key: string, fieldId: string) => update((site) => setBinding(site, page.id, node.id, key, fieldId || null), fieldId ? "Connect to a field" : "Disconnect from a field");
  return (
    <section className="ed-connect" data-tab="content" aria-label={`Connect to ${col.name}`}>
      <header>
        <strong>Connect to {col.name}</strong>
        <button type="button" className="ed-link" onClick={() => openCollections(col.id, null)}>
          Open the table
        </button>
      </header>
      <p>Connected settings show each {col.itemName.toLowerCase()}'s own value on its page.</p>
      <ul>
        {settings.map((s) => {
          const options = fieldsFor(col, s.key, s.value);
          const on = node.bind?.[s.key] ?? "";
          return (
            <li key={s.key} className={on ? "is-on" : ""}>
              <span title={s.key}>{s.label}</span>
              <select className="ed-input" aria-label={`Connect ${s.label}`} value={on} onChange={(e) => connect(s.key, e.target.value)}>
                <option value="">Not connected</option>
                {options.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
