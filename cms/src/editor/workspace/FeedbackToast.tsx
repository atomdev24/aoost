import { useEffect, useRef, useState } from "react";
import { undo, useEditor } from "../store";
import { feedbackFor } from "./feedback";

/**
 * The small message at the bottom after a structural change, with Undo (UI spec, Nov 2026:
 * "subtle" feedback). Fades in, stays about three seconds, and never takes focus.
 */
export function FeedbackToast() {
  const label = useEditor((s) => s.lastLabel);
  const steps = useEditor((s) => s.past.length + s.future.length * 1000);
  const [shown, setShown] = useState<{ text: string; undoable: boolean; key: number } | null>(null);
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    const fb = feedbackFor(label);
    if (!fb) return;
    setShown({ ...fb, key: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(null), 3200);
  }, [label, steps]);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!shown) return null;
  return (
    <div key={shown.key} className="ed-toast" role="status">
      <span>{shown.text}</span>
      {shown.undoable ? (
        <button
          type="button"
          onClick={() => {
            undo();
          }}
        >
          Undo
        </button>
      ) : null}
    </div>
  );
}
