/*
 * Getting ready for what's likely next, while the editor is idle after opening.
 *
 * Text: the first time a panel draws a character, Chrome has to find a font that has it (the
 * panels use symbols like ↔ ⤢ ⧉ that the system font lacks), and that search froze the first
 * selection for ~170 ms. Drawing every character the panels use once, out of sight, makes the
 * first real use as quick as later ones.
 */
const SYMBOLS = "°·×—…↑→↓↔↕↦↧↵↻⇧⇹−⌘▢▶▾◇◐◜◩☰♪✓⤢⧉⫴";
const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");

let done = false;

export function warmUp() {
  if (done || typeof window === "undefined") return;
  done = true;
  const idle = (fn: () => void) => {
    const w = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 3000 });
    else setTimeout(fn, 1200);
  };
  // One small piece per idle moment: done in one go it froze the editor for a third of a second.
  // The symbols first (finding fonts for them is the slow part), then each weight and size.
  const pieces: [number, number, string][] = [[400, 12, SYMBOLS]];
  for (const weight of [400, 500, 600]) for (const size of [11, 12, 13]) pieces.push([weight, size, ASCII + SYMBOLS]);
  const next = () => {
    const piece = pieces.shift();
    if (!piece) return;
    const [weight, size, text] = piece;
    const span = document.createElement("span");
    span.setAttribute("aria-hidden", "true");
    span.style.cssText = `position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;white-space:nowrap;font:${weight} ${size}px/1.4 var(--ed-font)`;
    span.textContent = text;
    document.body.append(span);
    // Reading its size makes Chrome lay the text out (and find the fonts) now.
    void span.getBoundingClientRect().width;
    span.remove();
    idle(next);
  };
  idle(next);
}
