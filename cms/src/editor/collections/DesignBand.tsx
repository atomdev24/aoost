import "./collections.css";
import { collectionById, itemAddress } from "../../model/cms";
import { demoPath } from "../demo";
import { currentPage, useEditor } from "../store";
import { openCollections } from "./collections-open";

/**
 * On a collection's page design: a band (like the variant band) saying what this page is, with a
 * quick way to preview it with any entry and to go back to the table.
 */
export function DesignBand() {
  const page = useEditor(currentPage);
  const col = useEditor((s) => (page.collectionId ? collectionById(s.site, page.collectionId) : undefined));
  if (!col) return null;
  const live = col.items.filter((i) => i.status === "live").length;
  return (
    <div className="ed-designband" role="status">
      <span className="ed-designband-dot" aria-hidden="true" />
      <span>
        <strong>Page design for {col.name}.</strong> Every live {col.itemName.toLowerCase()} ({live}) is built from this page; purple blocks fill from each one.
      </span>
      <select
        className="ed-input"
        aria-label={`Preview with a ${col.itemName.toLowerCase()}`}
        value=""
        onChange={(e) => {
          const item = col.items.find((i) => i.id === e.target.value);
          if (item) window.open(demoPath(`/preview${itemAddress(col, item)}`), "_blank", "noopener");
        }}
      >
        <option value="">Preview with…</option>
        {col.items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.title}
            {i.status === "draft" ? " (draft)" : ""}
          </option>
        ))}
      </select>
      <button type="button" className="ed-btn ed-btn-sm" onClick={() => openCollections(col.id, null)}>
        Open the table
      </button>
    </div>
  );
}
