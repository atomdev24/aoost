import { useEffect } from "react";
import { useEditor } from "../store";
import { hideTip, showTip, TIPS, useTip } from "./tips";

/** The tip bar: one quiet line at the bottom, never over the page's middle. Fades after a while. */
export function TipBar() {
  const tip = useTip();
  const picked = useEditor((s) => s.selection.length > 0);
  useEffect(() => {
    if (picked) showTip("select");
  }, [picked]);
  useEffect(() => {
    if (!tip) return;
    const t = setTimeout(hideTip, 14_000);
    return () => clearTimeout(t);
  }, [tip]);
  if (!tip) return null;
  return (
    <div className="ed-tip" role="status">
      <b>Tip</b>
      <span>{TIPS[tip]}</span>
      <button type="button" aria-label="Close the tip" onClick={hideTip}>
        ×
      </button>
    </div>
  );
}
