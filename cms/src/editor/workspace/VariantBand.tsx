import { useState } from "react";
import { ownerPage, renameVariant } from "../../model/variants";
import { currentPage, setPage, update, useEditor } from "../store";
import { electCurrentVariant, useStaging } from "./staging";

/**
 * Under the top bar while a variant is on screen: what you're editing, that
 * the live page isn't affected, and the way back or forward (Elect to staging).
 */
export function VariantBand() {
  const page = useEditor(currentPage);
  const site = useEditor((s) => s.site);
  const busy = useStaging((s) => s.busy);
  const error = useStaging((s) => s.error);
  const [name, setName] = useState<string | null>(null);
  if (!page.variantOf) return null;
  const owner = ownerPage(site, page);
  const commit = () => {
    if (name !== null && name.trim() && name.trim() !== page.variantName) update((s) => renameVariant(s, page.id, name), "Rename variant");
    setName(null);
  };
  return (
    <div className="ed-variant-band" role="region" aria-label="Variant">
      <span className="ed-variant-dot" aria-hidden="true" />
      <span className="ed-variant-text">
        <span className="ed-desk-only">Variant </span>
        <input
          className="ed-variant-name"
          aria-label="Variant name"
          value={name ?? page.variantName ?? ""}
          size={Math.max(6, (name ?? page.variantName ?? "").length)}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setName(null);
              (e.target as HTMLInputElement).blur();
            }
          }}
        />{" "}
        <span className="ed-desk-only">
          {" "}
          of <strong>{owner.title}</strong>. The live page isn't affected.
        </span>
      </span>
      {error ? <span className="ed-variant-error">{error}</span> : null}
      <button type="button" className="ed-btn ed-btn-sm" onClick={() => setPage(owner.id)}>
        Back<span className="ed-desk-only"> to {owner.title}</span>
      </button>
      <button type="button" className="ed-btn ed-btn-sm ed-btn-variant" disabled={busy} onClick={() => void electCurrentVariant()}>
        {busy ? "Sending…" : (
          <>
            Elect<span className="ed-desk-only"> to staging</span>
          </>
        )}
      </button>
    </div>
  );
}
