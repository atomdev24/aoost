import { useState } from "react";
import { ownerPage, renameVariant, statusOf, versionsOf } from "../../model/variants";
import { currentPage, update, useEditor } from "../store";
import { useCan } from "../team/role";
import { openDesigns } from "../templates/designs-open";
import { openVersion, propose } from "../variants/actions";
import { openPick } from "../variants/pick-open";
import { InDock } from "./Dock";
import { compareCurrentVariant } from "./staging";
import "../variants/variants.css";

/**
 * At the bottom while a variant is open: which variant, that the live page isn't touched, and the
 * next step. Anyone proposes it for review; a manager picks (EDITOR-VARIANTS.md).
 */
export function VariantBand() {
  const canPick = useCan("promote");
  const page = useEditor(currentPage);
  const site = useEditor((s) => s.site);
  const [name, setName] = useState<string | null>(null);
  if (!page.variantOf) return null;
  const owner = ownerPage(site, page);
  const status = statusOf(page);
  const versions = versionsOf(site, owner.id).length;
  const commit = () => {
    if (name !== null && name.trim() && name.trim() !== page.variantName) update((s) => renameVariant(s, page.id, name), "Rename variant");
    setName(null);
  };
  return (
    <InDock slot="bottom" name="variant">
      <div className="ed-variant-band" role="region" aria-label="Variant">
        <span className="ed-variant-dot" aria-hidden="true" />
        <span className="ed-variant-text">
          <span className="ed-desk-only">Editing </span>
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
            of <strong>{owner.title}</strong> · live page unaffected
          </span>
        </span>
        <span className={`vr-chip is-${status}`}>{status === "proposed" ? "Proposed" : "Draft"}</span>
        <button type="button" className="ed-btn ed-btn-sm ed-desk-only" title="This variant beside the live page" onClick={() => void compareCurrentVariant()}>
          Compare
        </button>
        {versions > 2 ? (
          <button type="button" className="ed-btn ed-btn-sm ed-desk-only" title="Every version of this page side by side" onClick={() => openDesigns(owner.id)}>
            Review
          </button>
        ) : null}
        <button type="button" className="ed-btn ed-btn-sm" title={`Back to ${owner.title}`} onClick={() => openVersion(owner.id)}>
          Back
        </button>
        {status === "proposed" ? (
          canPick ? (
            <button type="button" className="ed-btn ed-btn-sm ed-btn-variant" onClick={() => openPick(page.id)}>
              Pick<span className="ed-desk-only"> this one</span>
            </button>
          ) : (
            <button type="button" className="ed-btn ed-btn-sm" title="Take it back to a draft" onClick={() => propose(page.id, false)}>
              Back to draft
            </button>
          )
        ) : (
          <button type="button" className="ed-btn ed-btn-sm ed-btn-variant" title="Ask the team to look: it shows as Proposed, and managers can pick it" onClick={() => propose(page.id, true)}>
            Propose<span className="ed-desk-only"> for review</span>
          </button>
        )}
      </div>
    </InDock>
  );
}
