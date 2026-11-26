import { useMemo, useState } from "react";
import { publishChecks, type Check } from "../../model/checks";
import { selectBlock } from "../board/bridge";
import { getState, setLang, setPage, useEditor } from "../store";
import { anchorOf, Popover, type Anchor } from "../ui/Popover";
import { openPageSettings } from "../ui/page-settings-open";
import { openPanel } from "./rail-store";

/**
 * Pre-flight: a number left of Preview counting what's worth checking before it goes live (model/
 * checks.ts); click it for the list, with Fix on each. It never stops a publish. Hidden when there
 * is nothing to check.
 */
export function Preflight() {
  const site = useEditor((s) => s.site);
  const [at, setAt] = useState<Anchor | null>(null);
  const checks = useMemo(() => publishChecks(site), [site]);
  if (!checks.length) return null;
  const pages = new Map(site.pages.map((p) => [p.id, p.title]));
  const fix = (c: Check) => {
    setAt(null);
    if (getState().pageId !== c.pageId) setPage(c.pageId);
    if (c.lang) setLang(c.lang);
    if (c.kind === "seo" || c.kind === "campaign") {
      openPanel("pages");
      setTimeout(() => openPageSettings(c.pageId), 0);
      return;
    }
    if (c.nodeId) setTimeout(() => selectBlock(c.nodeId!), 60);
  };
  const toFix = checks.filter((c) => c.level === "fix").length;
  return (
    <>
      <button
        type="button"
        className={`ed-preflight${toFix ? "" : " is-soft"}`}
        aria-label={`${checks.length} ${checks.length === 1 ? "thing" : "things"} to check before publishing`}
        title="Pre-flight: things to check before publishing"
        aria-haspopup="dialog"
        aria-expanded={!!at}
        onClick={(e) => setAt(at ? null : anchorOf(e.currentTarget))}
      >
        {checks.length}
      </button>
      {at ? (
        <Popover anchor={at} onClose={() => setAt(null)} label="Pre-flight checks" width={340} className="ed-preflight-pop">
          <b>Pre-flight</b>
          <p className="ed-preflight-sub">Worth checking before it goes live. Nothing here stops you publishing.</p>
          <ul>
            {checks.map((c) => (
              <li key={c.id} className={`is-${c.level}`}>
                <span>
                  {c.text}
                  <small>{pages.get(c.pageId)}</small>
                </span>
                <button type="button" onClick={() => fix(c)}>
                  Fix
                </button>
              </li>
            ))}
          </ul>
        </Popover>
      ) : null}
    </>
  );
}
